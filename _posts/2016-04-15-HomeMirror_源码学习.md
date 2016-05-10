---
layout: post
title:  HomeMirror | 源码学习
categories: Android
tags: [Learn]
---
# HomeMirror | 源码学习
更新时间：2016-04-15

## 功能介绍
想了很久还是觉得这个并没有什么卵用，应该应用于静态展示吧，作者是将这个直接贴在镜子后面，还是先贴张图吧
![HomeMirror 主页面](/assets/2016-04/HomeMirror.png)
  
## 总体设计
总的来说就是将读取各个模块的信息并显示到屏幕上，而这个屏幕又是常亮的。

![HomeMirror 总体设计](/assets/2016-04/HomeMirror_总体设计.png)

## 详细设计

### 类设计

使用了好几个模块，大同小异，这里就只拿 XKCDModule 模块（也就是控制上面漫画的显示）举个例子

- ConfigurationSettings：保存设置项，内部使用 [SharedPreferences](http://developer.android.com/training/basics/data-storage/shared-preferences.html) 保存数据
- XKCDModule：使用 AsyncTask 来实现异步加载

```java
@Override
protected XKCDResponse doInBackground(Void... params) {
  RestAdapter restAdapter = new RestAdapter.Builder()
      .setEndpoint("http://xkcd.com")
      .build();

  XKCDRequest service = restAdapter.create(XKCDRequest.class);
  try {
    return service.getLatestXKCD();
  } catch (RetrofitError e) {
    Log.w("XKCDModule", "Error loading xkcd", e);
    return null;
  }
}
```

- XKCDRequest 和 XKCDResponse：Retrofit 相关的使用

```java
public interface XKCDRequest {
  @GET("/info.0.json")
  XKCDResponse getLatestXKCD();
}

public class XKCDResponse {
  public int day;
  public int month;
  public int year;
  public String img;
}
```

- MirrorActivity: 展示页面的相关的类，设定 ModuleListener 来控制 ImageView 的显示和隐藏 

```java
private XKCDModule.XKCDListener mXKCDListener = new XKCDModule.XKCDListener() {
  @Override
  public void onNewXKCDToday(String url) {
    if (TextUtils.isEmpty(url)) {
      mXKCDImage.setVisibility(View.GONE);
    } else {
      Picasso.with(MirrorActivity.this).load(url).into(mXKCDImage);
      mXKCDImage.setVisibility(View.VISIBLE);
    }
  }
};
```

在 onCreate() 中设置全屏

```java
if (Build.VERSION.SDK_INT < Build.VERSION_CODES.JELLY_BEAN) {
  getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
      WindowManager.LayoutParams.FLAG_FULLSCREEN);
} else {
  View decorView = getWindow().getDecorView();
  int uiOptions = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
      | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
      | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
      | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
      | View.SYSTEM_UI_FLAG_FULLSCREEN
      | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
      | View.SYSTEM_UI_FLAG_IMMERSIVE;
  decorView.setSystemUiVisibility(uiOptions);
  ActionBar actionBar = getSupportActionBar();
  actionBar.hide();
}
// 设置常亮
getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
setViewState();
```

读取设置项，控制是否显示 Module

```java
private void setViewState() {
  //...
  if (mConfigSettings.showXKCD()) {
    XKCDModule.getXKCDForToday(mXKCDListener);
  } else {
    mXKCDImage.setVisibility(View.GONE);
  }
  //...
}
```

这里顺便提一下这个 onNewIntent，因为这里的 launchMode 设为 singleInstance，所以重新启动 Activity 时的流程是：
onNewIntent -> onRestart -> onStart -> onResume，不是创建一个新的实例那样 onCreate -> onStart...

```java
@Override
protected void onNewIntent(Intent intent) {
  super.onNewIntent(intent);
  setViewState();
}
```

### 类图
![HomeMirror 类图](/assets/2016-04/HomeMirror_类图.png)

## 总结
这个项目使用了一些开源库：Twitter 家的 Fabric 的 crashlytics，Square 家的 retrofit 和 picasso，
以及 com.github.ahorn:android-rss （用于处理 RSS 中的信息），看了下使用，也算是一种收获吧

## 参考

- [Fabric 的 crashlytics](https://fabric.io/kits/android/crashlytics)
- nuuneoi, 2015, [Understand Android Activity's launchMode](http://inthecheesefactory.com/blog/understand-android-activity-launchmode/en)