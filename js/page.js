$(document).ready(function(){
    var hd = $('h2').not(".null");
    var num = hd.size();
    for (var i = 0; i < num; i++){
        var id = hd.eq(i).attr('id');
        var text = hd.eq(i).text();
        text = '<li><a href="#' + id + '">' + text + '</a></li>';
        $('ul#content').append(text);
        hd.eq(i).attr("class", "section scrollspy");
    }
    $('.scrollspy').scrollSpy();
});
