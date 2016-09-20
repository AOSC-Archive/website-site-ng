$(function() {

  if($("#flag-not-extend-banner-floating").length == 0) {
    var navHeight, floatBannerTop, floatBannerStatus;

    floatBannerStatus = false;
    $(".afe-floating-banner").hide();

    var nav = $("#nav");
    var banner = $(".afe-banner");
    var staticBanner = $(".afe-static-banner");
    var staticBannerContainer = $(".afe-static-banner>.container");
    var floatingBanner = $(".afe-floating-banner");

    $(window).resize(function() {
      navHeight = nav.height();
      floatBannerTop = banner.offset().top + staticBanner.height() - floatingBanner.height();
      $(document).scroll();
    }); $(window).resize();

    $(document).scroll(function() {
      if(!floatBannerStatus && $(document).scrollTop() + navHeight >  floatBannerTop) {
        floatBannerStatus = true;
        staticBannerContainer.addClass("invisible");
        floatingBanner.show().addClass("afe-fixed").css("top", navHeight + "px");
      }else if(floatBannerStatus && $(document).scrollTop() + navHeight <= floatBannerTop) {
        floatBannerStatus = false;
        staticBannerContainer.removeClass("invisible");
        floatingBanner.hide().removeClass("afe-fixed").css("top", "auto");
      }
    });
  }

});
