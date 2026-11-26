# 自然语言程序约束提取分类体系

可折叠、可搜索的静态分类树，展示三个子任务及其一级、二级技术路线的核心思想和文献支撑。

## 部署

此目录可以直接作为GitHub Pages的发布根目录，无需安装依赖或构建。
在仓库Settings → Pages选择Deploy from a branch，分支main、目录/(root)。
`.nojekyll`用于直接发布静态文件。

## 数据

分类数据为V6。识别与定位27篇，要素与关系抽取67篇，条件推导与补全38篇，跨任务去重77篇。
识别与定位一级路线依次为11、2、9、5篇；文献56（MeMo）归入典型表达语义匹配，文献71同属该路线。
条件推导与补全允许同篇支持多个信息来源，54次支持记录对应38篇文献。

更新`taxonomy-data.js`中的节点、核心思想和文献清单后，提交即可触发Pages更新。
页面不包含PDF原文、原始本地路径或内部复核记录。

## 交互

点击展开与收起，悬停查看核心思想，按任务筛选、搜索、查看文献、缩放和导出SVG。
桌面采用横向分类树，手机采用缩进式折叠树。

本地预览：`python -m http.server 8080`，然后打开`http://localhost:8080`。
交互形式参考[Apache ECharts树图示例](https://echarts.apache.org/examples/zh/editor.html?c=tree-basic)，实现采用原生HTML/CSS/JavaScript/SVG。
