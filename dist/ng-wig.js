/**
 * No box-sizing, such a shame
 *
 * 1.Calculate outer height
 * @param   bool    Include margin
 * @returns Number  Height in pixels
 *
 * 2. Set outer height
 * @param   Number          Height in pixels
 * @param   bool            Include margin
 * @returns angular.element Collection
 */
if (typeof angular.element.prototype.outerHeight !== 'function') {

angular.element.prototype.outerHeight = function() {
  function parsePixels(cssString) {
    if (cssString.slice(-2) === 'px') {
      return parseFloat(cssString.slice(0, -2));
    }
    return 0;
  }

  var includeMargin = false, height, $element = this.eq(0), element = $element[0];

  if (arguments[0] === true || arguments[0] === false || arguments[0] === undefined) {
    if (!$element.length) {
      return 0;
    }

    includeMargin = arguments[0] && true || false;

    if (element.outerHeight) {
      height = element.outerHeight;
    } else {
      height = element.offsetHeight;
    }
    if (includeMargin) {
      height += parsePixels($element.css('marginTop')) + parsePixels($element.css('marginBottom'));
    }
    return height;

  } else {
    if (!$element.length) {
      return this;
    }

    height = parseFloat(arguments[0]);

    includeMargin = arguments[1] && true || false;

    if (includeMargin) {
      height -= parsePixels($element.css('marginTop')) + parsePixels($element.css('marginBottom'));
    }

    height -= parsePixels($element.css('borderTopWidth')) + parsePixels($element.css('borderBottomWidth')) +
        parsePixels($element.css('paddingTop')) + parsePixels($element.css('paddingBottom'));

    $element.css('height', height + 'px');
    return this;
  }
};

}

angular.module('ngWig', ['ngwig-app-templates']);

angular.module('ngWig').directive('ngWig', function () {

      return {
        scope: {
          content: '=ngWig',
          showImages: '=showImages',
          rawSource: '=rawSource',
          activeLine: '=activeLine',
          activeChars: '=activeChars',
          highlightMode: '=highlightMode',
          editable: '=editable',
          debug: '&',
          cssPath: '@'
        },
        restrict: 'A',
        replace: true,
        templateUrl: function (elem, attr) {
          console.log("attr:");
          console.log(attr);
          if(attr.editable == 'false'){
            return 'ng-wig/views/ng-wig-view-only.html';
          }
          return 'ng-wig/views/ng-wig.html';
        },
        link: function (scope, element, attrs) {

          scope.originalHeight = element.outerHeight();
          scope.editMode = false;
          scope.autoexpand = !('autoexpand' in attrs) || attrs['autoexpand'] !== 'off';
          scope.cssPath = scope.cssPath ? scope.cssPath : 'css/ng-wig.css';

          scope.toggleEditMode = function() {
            scope.editMode = !scope.editMode;
          };

          scope.execCommand = function (command, options) {
            if(command ==='createlink'){
              options = prompt('Please enter the URL', 'http://');
            }
            scope.$emit('execCommand', {command: command, options: options});
          };

          scope.resizeEditor = function(height) {
            console.log("height:");
            console.log(height);
            var children = element.children();
            for (var i in children) {
              var child = children.eq(i);
              if (child.hasClass('nw-editor')) {
                child.outerHeight(height);
                break;
              }
            }

          }
        }
      }
    }
);


angular.module('ngWig').directive('ngWigEditable', ["$timeout", function ($timeout) {

      function init(scope, $element, attrs, ctrl) {
      //  define(['require','parse','cheerio'], function(require,parse,cheerio){
      //    console.log('cheerio');
      //    scope.cheerio = require('cheerio');
      //  }); //for fucks sake, make this a service
      //  require(['cheerio'],function(cheerio){
      //    scope.cheerio = cheerio;
      //  });

        var $document = $element[0].contentDocument,
            $body;
        $document.open();
        $document.write('<!DOCTYPE html>\n<html>\n\t<head>\n\t\t'+ (scope.cssPath ? ('<link href="'+ scope.cssPath +'" rel="stylesheet" type="text/css">') : '') + '\n\t</head>\n\t<body contenteditable="'+!!('true' == attrs.editable)+'">\n\t</body>\n</html>');
        $document.close();
        $body = angular.element($element[0].contentDocument.body);
        $html = angular.element($element[0].contentDocument.documentElement);

        //model --> view
        ctrl.$render = function () {
//          $body[0].innerHTML = ctrl.$viewValue || '';
            $html[0].innerHTML = ctrl.$viewValue || '';
            $body = angular.element($element[0].contentDocument.body);

            $body.attr('contenteditable', !!('true' == attrs.editable));
            $timeout(function(){resizeEditor()},500); //there has to be a better way to do this...
        };

        //view --> model
        scope.nodeIndexToCharIndex = function(html, nodeType, n) {
          var i,
            index = 0,
            search = '<' + nodeType;
          for (i = 0; i <= n; i += 1) {
            index = html.indexOf(search, index + 1);
          }
          return index;
        };
        scope.charIndexToLocation = function(html, index) {
          var substr = html.substr(0, index),
            lastLineBreak = substr.lastIndexOf('\n') || '',
            lineNumber = (substr.match(/\n/g)||[]).length + 1,
            columnNumber = index - lastLineBreak;
          return [lineNumber, columnNumber];
        };
        scope.getLine = function(index,cleanMatchHTML) {
          var substr = scope.rawSource.substr(0, index),
            lastLineBreak = substr.lastIndexOf('\n') || '',
            lineNumber = (substr.match(/\n/g) || []).length + 1,
            columnNumber = index - lastLineBreak;
          console.log('lineNumber, columnnumber:');
          console.log(lineNumber + ", " + columnNumber);
          $timeout(function () {
            console.log('setting activeLine');
            scope.activeLine = {line: lineNumber, column: columnNumber};
            scope.activeChars = {start: index, end: index + cleanMatchHTML.length};
          });
          return;
        }
        scope.updateLineNumber = function(e){
          var target = $(e.target, $element[0].contentDocument.documentElement);
          //target.css('border','4px solid red');
          console.log(scope.activeLine);
          var n = 0;
          //var index = scope.nodeIndexToCharIndex(scope.rawSource.toLowerCase(),target.nodeName.toLowerCase(),n);
          //var res = scope.charIndexToLocation(scope.rawSource.toLowerCase(),index);
          //var lineNumber = res[0];
          //var columnNumber = res[1];
          var nodeType = target[0].nodeName.toLowerCase();
          var cleanMatchHTML = target[0].outerHTML.replace(/"/g,"'");
          var cleanHTML = scope.rawSource.replace(/"/g,"'");

          //var re = new RegExp(cleanMatchHTML,"gi");
          //var matches = cleanHTML.match(re);
          //console.log(cleanHTML);
          //console.log(cleanMatchHTML);
          //console.log(matches);
          //console.log(re);
          var index_start = cleanHTML.indexOf(cleanMatchHTML);
          var index_last = cleanHTML.lastIndexOf(cleanMatchHTML);
          //console.log("start,end: "+index_start+","+index_last);

          if( -1 < index_start && index_start == index_last ){
            var index = cleanHTML.indexOf(cleanMatchHTML);
            //var index = scope.rawSource.toLowerCase().indexOf('<'+target.nodeName.toLowerCase());
            scope.getLine(index,cleanMatchHTML);

          } else {
            //find position

            //$cheerio = scope.cheerio.load(scope.rawSource, {lowerCaseTags: true});
            var $matches = $(nodeType, $element[0].contentDocument.documentElement)//$html.find(nodeType);

            console.log("all matches:");

            var cleanHTMLlower = cleanHTML.toLowerCase();
            var index=0;
            var pos=0;
            for(var i = 0; i < $matches.length; i += 1) {

              if($matches.eq(i)['0'] == target['0']){

                var j = 0;
                while(j <= i){
                  j += 1;
                  index = index+cleanHTMLlower.substr(index).indexOf("<"+nodeType)+1;
                }
                scope.getLine(index-1,cleanMatchHTML);

              }
            }

          }
          return;
        }
        $html.bind('click', function (e) {
          console.log('click in ng-wig');
          console.log(e);
          scope.updateLineNumber(e);
          //console.log(scope.activeLine);
          //$(e.target).css('border',"3px solid red");//.animate({border: ["3px solid red", "linear"]}, 5000);
            //.css('border',"3px solid red");
          resizeEditor(); //remove this
          e.preventDefault();
          return;
        });
        $html.bind('blur keyup change paste', function (e) {

          //$timeout(function() {
//              var consoleCustom = {
//                  panel: $body.append('<div>'),
//                  log: function(m){
//                      this.panel.prepend('<div>'+m+'</div>');
//                  }
//              };
//              consoleCustom.log('message');
//              consoleCustom.log(e); return;}
//              console.log('test2');
//              return;
//            }
//          );

          resizeEditor();
          $timeout(function blurkeyup() {
            ctrl.$setViewValue($html.html());
          });
        });

        scope.$on('execCommand', function (event, params) {
          var sel = $document.selection,
              command = params.command,
              options = params.options;
          if (sel) {
            var textRange = sel.createRange();
            $document.execCommand(command, false, options);
            textRange.collapse(false);
            textRange.select();
          }
          else {
            $document.execCommand(command, false, options);
          }
          $document.body.focus();
          //sync
          scope.$evalAsync(function () {
            ctrl.$setViewValue($html.html());
            resizeEditor();
          });
        });

        function resizeEditor() {
          if (!scope.autoexpand) {
            var height = scope.originalHeight;

            console.log("height1:");
            console.log(height);

          } else {
            $el =  angular.element($document.documentElement);
            height = $el.outerHeight();
            //console.log("$el:");
            //console.log($el);
            //console.log("height:");
            //console.log(height);
          }
          scope.resizeEditor(height);
        }

        scope.$watch('autoexpand', resizeEditor);
        scope.$watch('editMode', function(oldMode, newMode) {
          if (newMode) {
            resizeEditor();
          }
        });

        //ctrl.$viewChangeListeners.push(function(){
        //  console.log('hello we are ready!');
        //  resizeEditor();
        //});
       //Thought-wait until the iframe finishes loading, and then compute the height once intially.
       // This code
       //function resizeEditor() {
       //  $el.load(function () {
       //    if (!scope.autoexpand) {
       //      var height = scope.originalHeight;
       //
       //      console.log("height1:");
       //      console.log(height);
       //
       //    } else {
       //      $el = angular.element($document.documentElement);
       //      height = $el.outerHeight();
       //      console.log("$el:");
       //      console.log($el);
       //      console.log("height:");
       //      console.log(height);
       //    }
       //    scope.resizeEditor(height);
       //  });
       //}
      }

      return {
        restrict: 'A',
        require: 'ngModel',
        replace: true,
        link: init
      }
    }
]);

angular.module('ngwig-app-templates', ['ng-wig/views/ng-wig.html']);

angular.module("ng-wig/views/ng-wig.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("ng-wig/views/ng-wig.html",
    "<div class=\"ng-wig\" ng-model=\"content\">\n" +
    "  <ul class=\"nw-toolbar\">\n" +
    "    <li class=\"nw-toolbar__item\">\n" +
    "      <button type=\"button\" class=\"nw-button nw-button--header-one\" title=\"Header\" ng-click=\"execCommand('formatblock', '<h1>')\"></button>\n" +
    "    </li><!--\n" +
    "    --><li class=\"nw-toolbar__item\">\n" +
    "      <button type=\"button\" class=\"nw-button nw-button--paragraph\" title=\"Paragraph\" ng-click=\"execCommand('formatblock', '<p>')\"></button>\n" +
    "    </li><!--\n" +
    "    --><li class=\"nw-toolbar__item\">\n" +
    "      <button type=\"button\" class=\"nw-button nw-button--unordered-list\" title=\"Unordered List\" ng-click=\"execCommand('insertunorderedlist')\"></button>\n" +
    "    </li><!--\n" +
    "    --><li class=\"nw-toolbar__item\">\n" +
    "      <button type=\"button\" class=\"nw-button nw-button--ordered-list\" title=\"Ordered List\" ng-click=\"execCommand('insertorderedlist')\"></button>\n" +
    "    </li><!--\n" +
    "    --><li class=\"nw-toolbar__item\">\n" +
    "      <button type=\"button\" class=\"nw-button nw-button--bold\" title=\"Bold\" ng-click=\"execCommand('bold')\"></button>\n" +
    "    </li><!--\n" +
    "    --><li class=\"nw-toolbar__item\">\n" +
    "      <button type=\"button\" class=\"nw-button nw-button--italic\" title=\"Italic\" ng-click=\"execCommand('italic')\"></button>\n" +
    "    </li><!--\n" +
    "    --><li class=\"nw-toolbar__item\">\n" +
    "      <button type=\"button\" class=\"nw-button nw-button--link\" title=\"link\" ng-click=\"execCommand('createlink')\"></button>\n" +
    "    </li><!--\n" +
    "    --><li class=\"nw-toolbar__item\">\n" +
    "      <button type=\"button\" class=\"nw-button nw-button--source\" ng-class=\"{ 'nw-button--active': editMode }\" ng-click=\"toggleEditMode()\"></button>\n" +
    "    </li>\n" +
    "  </ul>\n" +
    "\n" +
    "  <div class=\"nw-editor\">\n" +
    "    <textarea class=\"nw-editor__src\" ng-show=\"editMode\" ng-model=\"content\"></textarea>\n" +
    "    <iframe scrolling=\"{ autoexpand ? 'no' : 'yes' }\" show-images=\"showImages\" active-line=\"activeLine\" active-chars=\"activeChars\" highlight-mode=\"highlightMode\" class=\"nw-editor__res\" frameBorder=\"0\" ng-hide=\"editMode\" ng-model=\"content\" ng-wig-editable editable=\"true\" si-iframe></iframe>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("ng-wig/views/ng-wig-view-only.html",
    "<div class=\"ng-wig\" ng-model=\"content\">\n" +
    "\n" +
    "  <div class=\"nw-editor\">\n" +
    "    <textarea class=\"nw-editor__src\" ng-show=\"editMode\" ng-model=\"content\"></textarea>\n" +
    "    <iframe scrolling=\"{ autoexpand ? 'no' : 'yes' }\" show-images=\"showImages\" active-line=\"activeLine\" active-chars=\"activeChars\" highlight-mode=\"highlightMode\" class=\"nw-editor__res\" frameBorder=\"0\" ng-hide=\"editMode\" ng-model=\"content\" ng-wig-editable editable=\"false\" si-iframe></iframe>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);
