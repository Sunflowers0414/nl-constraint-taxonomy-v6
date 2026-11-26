# 自然语言程序约束提取分类体系

可折叠、可搜索的静态分类树，展示三个子任务及其一级、二级技术路线的核心思想和文献支撑。

## 在线访问

可以通过以下网址直接访问网页，无需在本地启动项目：

[https://sunflowers0414.github.io/nl-constraint-taxonomy-v6/](https://sunflowers0414.github.io/nl-constraint-taxonomy-v6/)

## 部署

此目录可以直接作为GitHub Pages的发布根目录，无需安装依赖或构建。
在仓库Settings → Pages选择Deploy from a branch，分支main、目录/(root)。
`.nojekyll`用于直接发布静态文件。

## 交互

点击展开与收起，悬停查看核心思想，按任务筛选、搜索、查看文献、缩放和导出SVG。
桌面采用横向分类树，手机采用缩进式折叠树。

本地预览：`python -m http.server 8080`，然后打开`http://localhost:8080`。
交互形式参考[Apache ECharts树图示例](https://echarts.apache.org/examples/zh/editor.html?c=tree-basic)，实现采用原生HTML/CSS/JavaScript/SVG。
