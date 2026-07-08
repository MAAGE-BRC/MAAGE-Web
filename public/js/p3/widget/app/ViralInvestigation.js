define([
  'dojo/_base/declare',
  'dojo/text!./templates/ViralInvestigationOverview.html',
  '../viewer/SidebarViewerBase'
], function (
  declare,
  OverviewHTML,
  SidebarViewerBase
) {

  return declare([SidebarViewerBase], {
    perspectiveLabel: 'Viral Outbreak Investigation',
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
        description: 'Start by uploading reads or assembled viral genomes',
        widgetClass: 'p3/widget/app/InvestigationUpload'
      },
      {
        id: 'ViralGenomeAssembly',
        title: 'Step 2. Assemble Viral Genomes',
        icon: 'icon-genome',
        description: 'Viral Genome Assembly',
        widgetClass: 'p3/widget/app/ViralAssembly'
      },
      {
        id: 'ViralGenomeAnnotation',
        title: 'Step 3. Annotate Viral Genomes',
        icon: 'icon-genome',
        description: 'Viral Genome Annotation',
        widgetClass: 'p3/widget/app/Annotation'
      },
      {
        id: 'MyGenomes',
        title: 'Step 4. Review Related Public Isolates',
        icon: 'icon-lock3',
        description: 'Find genomes and save as group',
        widgetClass: 'p3/widget/app/InvestigationMyGenomes'
      },
      {
        id: 'WholeGenomeSNPAnalysis',
        title: 'Step 5. Compare Related Isolates',
        icon: 'icon-selection-Sequence',
        description: 'Whole Genome SNP Analysis',
        widgetClass: 'p3/widget/app/WholeGenomeSNPAnalysis'
      },
      {
        id: 'PhylogeneticTree',
        title: 'Step 6. Visualize Evolutionary Relationships',
        icon: 'icon-tree',
        description: 'Phylogenetic Analysis',
        widgetClass: 'p3/widget/app/ViralGenomeTree'
      }
    ]
  });
});
