CKEditor Chart Plugin
=====================

This is a proof-of-concept plugin that adds support for injecting charts into CKEditor.
To render charts, the [Chart.js](http://www.chartjs.org/) library is used.
The plugin serves as an example of using external JavaScript libraries in CKEditor, using the [widgets feature](http://docs.ckeditor.com/#!/guide/widget_sdk_intro). It has lots of comments inside to help you understand how it was built.

## Live Demo

View [live demo](http://wwalc.github.io/chart/).

## Installation

1. Put the plugin into the CKEditor "plugins" folder.
2. Enable the plugin with `config.extraPlugins`
3. Add the `Chart` button to the toolbar if it will not appear automatically.


    CKEDITOR.replace( 'editor1', {
        extraPlugins: 'chart'
    }

In case of any problems with installation, there is [an online sample](http://wwalc.github.io/chart/sample.html) available that should help you get started.

## Rendering charts on a website

Chart created in CKEditor is represented as a simple `<div>` element with data attributes. This is by design, because such a simplified form allows you to re-edit the chart in the future. It ensures that your content will be future-proof, allowing you to to use different styling for charts embed on your website when you redesign it or to use the future major versions of Chart.js library with different API/features.

To convert `<div>` elements into charts, include `chart.min.js` and `widget2chart.js` on your website. See the [online sample](http://wwalc.github.io/chart/sample.html).

## Screenshot

![Charts in CKEditor](http://s10.postimg.org/efvmb3fmh/chartjs.png)

## The future of this plugin

For now, this is a proof-of-concept plugin. However if you would like to leave any feedback, fill a future request, report a bug etc., feel free to do so.

## Browser compatibility

Any modern browser should be supported. **IE8 is not supported.**

### License

Licensed under the GPL, LGPL and MPL licenses, at your choice.

For full details about the license, please check the LICENSE.md file.
