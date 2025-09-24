import os
from dotenv import load_dotenv

from django.views.generic import TemplateView

from qux.seo.mixin import SEOMixin
from apps.gizmo.utils import ClubData
from apps.gizmo.decorators import timeit


load_dotenv()


class ApplicationHomeView(SEOMixin, TemplateView):
    template_name = "gizmo/index.html"


class ClubbedContractsData(TemplateView):
    template_name = "gizmo/index.html"

    @timeit
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        update = self.request.GET.get("update", False)
        url = (
            os.getenv("BASE_URL")
            + self.kwargs.get("exchange", "IFED")
            + "/"
            + self.kwargs.get("symbol")
            + "/"
        )
        club_data = ClubData(url, update=update)
        context["clubbed_data"] = club_data.run()
        return context
