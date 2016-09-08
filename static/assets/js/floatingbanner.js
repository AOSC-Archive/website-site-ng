$(function() {

  if($("#flag-not-extend-banner-floating").length == 0) {
    var navHeight, floatBannerTop, floatBannerStatus;

    floatBannerStatus = false;
    $(".afe-floating-banner").hide();

    $(window).resize(function() {
      navHeight = $("#nav").height();
      floatBannerTop = $(".afe-banner").offset().top + $(".afe-static-banner").height() - $(".afe-floating-banner").height();
      $(document).scroll();
    }); $(window).resize();

    $(document).scroll(function() {
      if(!floatBannerStatus && $(document).scrollTop() + navHeight >  floatBannerTop) {
        floatBannerStatus = true;
        $(".afe-static-banner>.container").addClass("invisible");
        $(".afe-floating-banner").show().addClass("afe-fixed").css("top", navHeight + "px");
      }else if(floatBannerStatus && $(document).scrollTop() + navHeight <= floatBannerTop) {
        floatBannerStatus = false;
        $(".afe-static-banner>.container").removeClass("invisible");
        $(".afe-floating-banner").hide().removeClass("afe-fixed").css("top", "auto");
      }
    });
  }

});
