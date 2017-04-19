$(function() {

  if($("#flag-not-extend-banner-floating").length === 0) {
    var navHeight, floatBannerTop, floatBannerStatus;

    floatBannerStatus = false;
    $(".afe-floating-banner").css("opacity", "0");

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
      var offset = 10;
      if(!floatBannerStatus && $(document).scrollTop() + navHeight >  floatBannerTop - offset) {
        floatBannerStatus = true;
        //staticBannerContainer.addClass("invisible");
        floatingBanner.css("opacity", "0.6").addClass("afe-fixed").css("top", navHeight + "px");
      }else if(floatBannerStatus && $(document).scrollTop() + navHeight <= floatBannerTop -offset) {
        floatBannerStatus = false;
        //staticBannerContainer.removeClass("invisible");
        floatingBanner.css("opacity", "0").removeClass("afe-fixed").css("top", "auto");
      }
    });
  }

});
