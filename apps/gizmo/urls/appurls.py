from django.urls import path
from ..views.appviews import ApplicationHomeView, ClubbedContractsData


urlpatterns = [
    path("", ApplicationHomeView.as_view(), name="home"),
    path(
        "contracts/display/<str:exchange>/<str:symbol>/",
        ClubbedContractsData.as_view(),
        name="clubbed_contracts_data_display",
    ),
]
