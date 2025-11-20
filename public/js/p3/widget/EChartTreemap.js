define(["dojo/_base/declare", "./EChart", "dojo/_base/lang"], function (
	declare,
	EChart,
	lang
)
{
	return declare([EChart], {
		baseClass: "EChartTreemap",

		updateChart: function (data)
		{
			if (!this.chart || !data)
			{
				return;
			}

			let treeData = [];

			if (data.treeData)
			{
				treeData = data.treeData;
			} else if (data.categories)
			{
				treeData = this._convertToTreeData(data.categories);
			} else if (data.data && Array.isArray(data.data))
			{
				treeData = data.data.map(function (item)
				{
					return {
						name: item.name || item.label || "Item",
						value: item.value || 0,
						itemStyle: item.itemStyle || {},
						children: item.children || [],
					};
				});
			}

			const option = {
				title: {
					text: this.title,
					left: "center",
				},
				tooltip: {
					formatter: function (info)
					{
						const value = info.value;
						const treePathInfo = info.treePathInfo;
						const treePath = [];

						for (let i = 1; i < treePathInfo.length; i++)
						{
							treePath.push(treePathInfo[i].name);
						}

						return [
							'<div class="tooltip-title">' + treePath.join(" → ") + "</div>",
							"Value: " + value,
						].join("");
					},
				},
				series: [
					{
						name: data.seriesName || "Treemap",
						type: "treemap",
						data: treeData,
						leafDepth: data.leafDepth || 1,
						roam: data.roam !== false,
						nodeClick: data.nodeClick || "zoomToNode",
						breadcrumb: {
							show: data.showBreadcrumb !== false,
							top: "top",
						},
						label: {
							show: true,
							formatter: "{b}",
							fontSize: data.labelFontSize || 12,
						},
						upperLabel: {
							show: true,
							height: 30,
						},
						itemStyle: {
							borderColor: "#fff",
							borderWidth: 2,
							gapWidth: 2,
						},
						levels: data.levels || this._getDefaultLevels(),
						visualDimension: data.visualDimension || 0,
					},
				],
			};

			if (data.visualMap)
			{
				option.visualMap = lang.mixin(
					{
						type: "continuous",
						min: data.visualMapMin || 0,
						max: data.visualMapMax || 100,
						inRange: {
							color: ["#e0f3f8", "#abd9e9", "#74add1", "#4575b4", "#313695"],
						},
						calculable: true,
					},
					data.visualMap
				);
			}

			if (data.colorMapping)
			{
				option.series[0].colorMappingBy = data.colorMapping;
			}

			this.chart.setOption(option);
		},

		_convertToTreeData: function (categories)
		{
			const result = [];

			for (let category in categories)
			{
				if (categories.hasOwnProperty(category))
				{
					const item = {
						name: category,
						children: [],
					};

					const catData = categories[category];
					if (typeof catData === "object" && !Array.isArray(catData))
					{
						item.children = this._convertToTreeData(catData);

						item.value = item.children.reduce(function (sum, child)
						{
							return sum + (child.value || 0);
						}, 0);
					} else if (Array.isArray(catData))
					{
						item.children = catData.map(function (subItem)
						{
							return {
								name: subItem.name || subItem,
								value: subItem.value || 1,
							};
						});
						item.value = item.children.reduce(function (sum, child)
						{
							return sum + child.value;
						}, 0);
					} else
					{
						item.value = catData;
					}

					result.push(item);
				}
			}

			return result;
		},

		_getDefaultLevels: function ()
		{
			return [
				{
					itemStyle: {
						borderColor: "#777",
						borderWidth: 0,
						gapWidth: 1,
					},
					upperLabel: {
						show: false,
					},
				},
				{
					itemStyle: {
						borderColor: "#555",
						borderWidth: 5,
						gapWidth: 1,
					},
					emphasis: {
						itemStyle: {
							borderColor: "#ddd",
						},
					},
				},
				{
					colorSaturation: [0.35, 0.5],
					itemStyle: {
						borderWidth: 5,
						gapWidth: 1,
						borderColorSaturation: 0.6,
					},
				},
			];
		},
	});
});
