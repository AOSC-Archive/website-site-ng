/*
 * I am a plugin to make a panel slideDown when mouse hovers on it.
 *
 */
(function($) {
  $.fn.hoverPanel = function(options) {
    var defaults = {
      selector  : "p",
      speed     : "fast",
      delay     : 100,
    }
    return $(this).each(function() {

      var setttings = $.extend(defaults, options || {});
      var inTimer, outTimer;
      var caller = $(this).find(setttings.selector);
      caller.hide();

      $(this).hover(function() {
        clearTimeout(outTimer);
        inTimer = setTimeout(function() {
          caller.slideDown(setttings.speed);
        }, setttings.delay);
      }, function() {
        clearTimeout(inTimer);
        outTimer = setTimeout(function() {
          caller.slideUp(setttings.speed);
        }, setttings.delay);
      });

    });
  };
})(jQuery);
