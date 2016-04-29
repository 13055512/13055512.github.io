$(document).ready(function(){
    var hd = $('h2').not(".null");
    var num = hd.size();
    if (num > 0) {
        var id = hd.first().attr('id');
        var text = hd.first().text();
        text = '<li id="id' + id + '"><a class="active">' + text + '</a></li>';
        $('ul#content').append(text);
    for (var i = 1; i < num; i++){
        var id = hd.eq(i).attr('id');
        var text = hd.eq(i).text();
        text = '<li id="id' + id + '"><a class="disactive">' + text + '</a></li>';
        $('ul#content').append(text);
    }
    };
});
