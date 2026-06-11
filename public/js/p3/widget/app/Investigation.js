define([
  'dojo/_base/declare',
  'dojo/text!./templates/InvestigationOverview.html',
  '../viewer/SidebarViewerBase'
], function (
  declare,
  OverviewHTML,
  SidebarViewerBase
) {

  return declare([SidebarViewerBase], {
    perspectiveLabel: 'Epidemiology Investigation',
    perspectiveIconClass: 'icon-selection-Experiment',
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
        id: 'ComprehensiveGenomeAnalysis',
        title: 'Comprehensive Genome Analysis',
        icon: 'icon-genome',
        description: 'Assemble and annotate genomes from raw reads',
        widgetClass: 'p3/widget/app/ComprehensiveGenomeAnalysis'
      },
      {
        id: 'CoreGenomeMLST',
        title: 'Core Genome MLST',
        icon: 'icon-cluster',
        description: 'Strain-level typing and cluster detection',
        widgetClass: 'p3/widget/app/CoreGenomeMLST'
      },
      {
        id: 'WholeGenomeSNPAnalysis',
        title: 'Whole Genome SNP Analysis',
        icon: 'icon-selection-SNP',
        description: 'Identify SNPs for outbreak tracking',
        widgetClass: 'p3/widget/app/WholeGenomeSNPAnalysis'
      },
      {
        id: 'PhylogeneticTree',
        title: 'Phylogenetic Tree',
        icon: 'icon-tree',
        description: 'Build phylogenetic trees from selected genomes',
        widgetClass: 'p3/widget/app/PhylogeneticTree'
      },
      {
        id: 'MetagenomicReadMapping',
        title: 'Metagenomic Read Mapping',
        icon: 'icon-reads',
        description: 'Optional pre-assembly screening of raw reads',
        widgetClass: 'p3/widget/app/MetagenomicReadMapping'
      }
    ]
  });
});
