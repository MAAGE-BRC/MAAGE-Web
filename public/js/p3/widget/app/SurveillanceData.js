define([
  'dojo/_base/declare',
  'dojo/text!./templates/SurveillanceDataOverview.html',
  '../viewer/SidebarViewerBase'
], function (
  declare,
  OverviewHTML,
  SidebarViewerBase
) {

  return declare([SidebarViewerBase], {
    perspectiveLabel: 'Explore Surveillance Data',
    perspectiveIconClass: 'icon-selection-Experiment',
    sidebarTitle: 'Workflow Steps',
    defaultPanel: 'overview',

    panels: [
      {
        id: 'overview',
        title: 'Overview',
        icon: 'icon-info',
        description: 'Workflow description and getting started',
        content: OverviewHTML
      },
      {
        id: 'SearchGenomes',
        title: 'Search Genomes',
        icon: 'icon-selection-Genome',
        description: 'Define a custom surveillance dataset',
        widgetClass: 'p3/widget/app/InvestigationMyGenomes'
      }
    ]
  });
});
