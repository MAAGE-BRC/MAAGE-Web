define([
  'dojo/_base/declare',
  'dojo/text!./templates/BacterialInvestigationOverview.html',
  '../viewer/SidebarViewerBase'
], function (
  declare,
  OverviewHTML,
  SidebarViewerBase
) {

  return declare([SidebarViewerBase], {
    perspectiveLabel: 'Bacterial Outbreak Investigation',
    perspectiveIconClass: 'icon-selection-Investigation',
    sidebarTitle: 'Investigation Steps',
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
        id: 'UploadSequencingData',
        title: 'Step 1. Upload Your Sequencing Data',
        icon: 'icon-upload',
        description: 'Start by uploading reads or assembled genomes',
        widgetClass: 'p3/widget/app/InvestigationUpload'
      },
      {
        id: 'ComprehensiveGenomeAnalysis',
        title: 'Step 2. Identify and Characterize Your Pathogen',
        icon: 'icon-genome',
        description: 'Comprehensive Genome Analysis',
        widgetClass: 'p3/widget/app/ComprehensiveGenomeAnalysis'
      },
      {
        id: 'MyGenomes',
        title: 'Step 3. Review Related Public Isolates',
        icon: 'icon-lock3',
        description: 'Find genomes and save as group',
        widgetClass: 'p3/widget/app/InvestigationMyGenomes'
      },
      {
        id: 'CoreGenomeMLST',
        title: 'Step 4. Compare Suspected Outbreak Isolates',
        icon: 'icon-cluster',
        description: 'Core Genome MLST',
        widgetClass: 'p3/widget/app/CoreGenomeMLST'
      },
      {
        id: 'WholeGenomeSNPAnalysis',
        title: 'Step 5. Resolve Closely Related Isolates',
        icon: 'icon-selection-Sequence',
        description: 'Whole Genome SNP Analysis',
        widgetClass: 'p3/widget/app/WholeGenomeSNPAnalysis'
      },
      {
        id: 'PhylogeneticTree',
        title: 'Step 6. Visualize Evolutionary Relationships',
        icon: 'icon-tree',
        description: 'Phylogenetic Tree',
        widgetClass: 'p3/widget/app/PhylogeneticTree'
      }
    ]
  });
});
