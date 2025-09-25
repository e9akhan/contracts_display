import os
import logging
from datetime import date, datetime
import requests
from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv

import pandas as pd

from django.utils import timezone
from django.conf import settings
from django.core.cache import cache


load_dotenv()

logger = logging.getLogger(__name__)


class ProcessData:
    def __init__(self, data):
        self.df = pd.DataFrame(data)
        self.df["refdate"] = pd.to_datetime(self.df["refdate"])

    def aggregate(self, df):
        return (
            df.groupby(pd.Grouper(key="refdate", freq="W"))
            .agg({"price": "last", "volume": "sum"})
            .reset_index()
        )

    def clean(self):
        return self.df[["refdate", "price", "volume"]]

    def to_json(self, df):
        df["refdate"] = df["refdate"].dt.strftime("%Y-%m-%d")
        df = df.fillna(0)
        return df.to_json(orient="records", date_format="iso")


class ClubData:
    def __init__(self, url, update=True):
        self.total_months = int(os.getenv("TOTAL_MONTHS"))
        self.url = url
        self.request_timeout = int(os.getenv("REQUEST_TIMEOUT"))
        self.api_token = os.getenv("API_TOKEN")
        self.update = update
        self.max_retries = int(os.getenv("MAX_RETRIES"))

    def get_params(self):
        return [
            {
                "fordate": f"{(date.today() + relativedelta(months=month)).strftime("%Y-%m")}-01",
                "data_format": "json",
            }
            for month in range(0, self.total_months)
        ]

    @staticmethod
    def get_cache_timeout_seconds():
        now = timezone.now()

        expire_time_str = getattr(settings, "CACHE_EXPIRE_TIME", "23:59:59")
        expire_hour, expire_minute, expire_second = map(int, expire_time_str.split(":"))
        expire_at = datetime.combine(now.date(), datetime.min.time()).replace(
            hour=expire_hour,
            minute=expire_minute,
            second=expire_second,
            tzinfo=now.tzinfo,
        )

        if expire_at <= now:
            expire_at = expire_at + timezone.timedelta(days=1)

        return int((expire_at - now).total_seconds())

    def run(self):
        key = f"clubbed-data-{timezone.now().date()}"
        cached_data = cache.get(key)

        if not self.update and cached_data:
            return cached_data

        clubbed_data_dict = {}

        headers = {"Authorization": f"Token {self.api_token}"}
        for idx, param in enumerate(self.get_params(), start=1):
            i = 0
            response = None

            while i < self.max_retries:
                try:
                    response = requests.get(
                        self.url,
                        params=param,
                        headers=headers,
                        timeout=self.request_timeout,
                    )

                    if response.status_code == 200:
                        break
                except requests.exceptions.RequestException as _:
                    pass

                i += 1

            if not response or response.status_code != 200:
                logger.info("Unable to fetch data for %s", param)
                continue

            data = response.json()

            process_data = ProcessData(data=data)
            processed_data = process_data.clean()

            if len(data) > 100:
                processed_data = process_data.aggregate(processed_data)

            clubbed_data_dict[f"data_{idx}"] = process_data.to_json(processed_data)

        cache_timeout_seconds = self.__class__.get_cache_timeout_seconds()
        cache.set(key, clubbed_data_dict, timeout=cache_timeout_seconds)
        return clubbed_data_dict
