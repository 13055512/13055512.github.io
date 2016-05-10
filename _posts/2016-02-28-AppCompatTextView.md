---
layout: post
title:  AppCompatTextView | 源码学习
categories: Android
tags: [Learn]
---

# AppCompatTextView | 源码学习
更新时间：2016-02-28

## 概述
>A TextView which supports compatible features on older version of the platform, including:
 * Supports textAllCaps style attribute which works back to Eclair MR1.  
 * Allows dynamic tint of it background via the background tint methods in ViewCompat.  
 * Allows setting of the background tint using backgroundTint and backgroundTintMode.   
>This will automatically be used when you use TextView in your layouts. You should only need to manually use this class when writing custom views.

android.support.v7.widget.AppCompatTextView 是 AppCompat Support Library 随着 Android revision 21 引入的新内容，同为一系列的还有 AppCompatButton，AppCompatCheckBox
等，而这些共同的目的是为了在所有的 Api 7+ 的设备上实现新特性。

## 相比 TextView 所引入的新特性

### 支持 textAllCaps 属性

在 TextView 中也支持 textAllCaps 但是不支持低于 Api 14 的版本，而引入 AppCompatTextView
则能支持 Android 2.1 以上的设备

```java
public AppCompatTextView(Context context, AttributeSet attrs, int defStyle) {
  super(context, attrs, defStyle);
  // 首先读取 TextAppearance style id
  TypedArray a = context.obtainStyledAttributes(attrs, R.styleable.AppCompatTextView,
      defStyle, 0);
  final int ap = a.getResourceId(R.styleable.AppCompatTextView_android_textAppearance, -1);
  a.recycle();
  // 然后检查 TextAppearance's textAllCaps 的值
  if (ap != -1) {
    TypedArray appearance = context.obtainStyledAttributes(ap, R.styleable.TextAppearance);
    if (appearance.hasValue(R.styleable.TextAppearance_textAllCaps)) {
      /* 若找不到 R.styleable.AppCompatTextView_textAllCaps 的 key,则 getBoolean() 返回 false
        反之，返回这个 key
      */
      setAllCaps(appearance.getBoolean(R.styleable.TextAppearance_textAllCaps, false));
    }
    appearance.recycle();
  }
  // 读取 style 的值
  a = context.obtainStyledAttributes(attrs, R.styleable.AppCompatTextView, defStyle, 0);
  if (a.hasValue(R.styleable.AppCompatTextView_textAllCaps)) {
    /* 若找不到 R.styleable.AppCompatTextView_textAllCaps 的 key,则 getBoolean() 返回 false
      反之，返回这个 key
    */
    setAllCaps(a.getBoolean(R.styleable.AppCompatTextView_textAllCaps, false));
  }
  a.recycle();
}
public void setAllCaps(boolean allCaps) {
  setTransformationMethod(allCaps ? new AllCapsTransformationMethod(getContext()) : null);
}
```
设置 setAllCaps 用到 AllCapsTransformationMethod 这个类

```java
package android.support.v7.text;
public class AllCapsTransformationMethod implements TransformationMethod {
  private Locale mLocale;

  public AllCapsTransformationMethod(Context context) {
    mLocale = context.getResources().getConfiguration().locale;
  }

  @Override
  public CharSequence getTransformation(CharSequence source, View view) {
    return source != null ? source.toString().toUpperCase(mLocale) : null;
  }

  @Override
  public void onFocusChanged(View view, CharSequence sourceText, boolean focused,
      int direction, Rect previouslyFocusedRect) {
  }
}
```

### Android Material Design Tint（着色）
在 Api 21 之前，不支持 background tint 在 XML 设置，于是提供了 setBackgroundTintList 和
setBackgroundTintMode 用来手动更改需要着色的颜色，另外需要实现 TintableBackgroundView 接口。
使用方法共有两种形式：

```xml
// 前提需要有设置 android:background 属性
android:backgroundTint=''

android:tint=''
```
这个两个属性可以帮我们在原图只有一张的情况下，轻松更换颜色，减少了 apk 的大小。
其中 TintMode 共有 6 种，分别是 add，multiply，screen，src_atop，src_in（默认），src_over。
效果图：  
![TintMode](http://img.blog.csdn.net/20150810144201490)

### Tint 的兼容使用
在 Android 5.0 以下，不能直接在 Layout 中直接使用，只能这么使用

```java
ViewCompat.setSupportBackgroundTintList(ColorStateList tint);
ViewCompat.setSupportBackgroundTintMode(PorterDuff.Mode tintMode);
```
举个例子

```java
// XML
<andorid.support.v7.widget.AppCompatTextView
  andorid:id="@+id/test"
  android:layout_width="wrap_content"
  android:layout_height="wrap_content" />

// java
AppCompatTextView appCompatTextView = (AppCompatTextView) findViewById(R.id.test);
ColorStateList lists = getResources().getColorStateList(R.color.red);
appCompatTextView.setSupportBackgroundTintList(lists);
appCompatTextView.setSupportBackgroundTintMode(PorterDuff.Mode.SRC_IN);
```

## 写在最后

- 若发现什么错误，欢迎指正。
- Sunzxyong. (2015). [使用Material Design Tint和视图详解](http://blog.csdn.net/u010687392/article/details/47399719)
