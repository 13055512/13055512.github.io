---
layout: post
title: CursorLoader 浅析
categories: Android
tags: [Loader]
---

# CursorLoader 浅析
更新时间：2016-03-27

## 简述
Android 3.0 （API 11）引入了 Loader，能够轻松的在 Activity 或 Fragment 中异步加载数据。异步加载所体现的设计模式是[观察者模式](http://blog.qiji.tech/archives/2966)，当完成时通过回调来通知主线程。
Loader 具有以下特性：

- 可用于每个 activity 和 Fragment
- 支持异步加载数据
- 监控其数据源并在内容变化时传递新结果
- 在某一配置更改后重建加载器时，会自动重新连接上一个加载器的 Cursor，因此，它们无需重新查询数据

CursorLoader 是 AsyncTaskLoader 的子类，它将查询 ContentResolver 并返回一个 Cursor

### 生命周期
![AsyncTaskLoader](/assets/2016-03/CursorLoader.png)
CursorLoader 继承自 AsyncTaskLoader ,其生命周期和它类似，不过有一项附加的优化功能，即：如果 Cursor 已完成加载，并且在 Activity 重启之前于后台执行加载，则 CursorLoader 会在 Loader 重新初始化前调用 onLoadFinished() 而不是在初始化之后。

## 简单用法
使用加载器的应用通常包括：

- Activity 或 Fragment
- LoaderManager 的实例
- 一个 CursorLoader，用于加载 ContentProvider 支持的数据。当然也可以自定义
- 一个 LoaderManager.LoaderCallbacks 实现。可以使用它来创建加载器，并管理对现有加载器的引用
- 一种显示加载器数据的方法，如 SimpleCursorAdapter。
- 使用 CursorLoader 时的数据源，如 ContentProvider。

```java
public class ExampleFragment extends Fragment implements LoaderManager.LoaderCallbacks<Cursor> {
  // 省略了其他部分
  @Override public void onActivityCreated(Bundle savedInstanceState) {
    getLoaderManager().initLoader(0, null, this);
    super.onActivityCreated(savedInstanceState);
  }
  public Loader<Cursor> onCreateLoader(int id, Bundle args) {
    Uri baseUri;
    if (mCurFilter != null) {
      baseUri = Uri.withAppendedPath(Contacts.CONTENT_FILTER_URI,
          Uri.encode(mCurFilter));
    } else {
      baseUri = Contacts.CONTENT_URI;
    }
    String select = "((" + Contacts.DISPLAY_NAME + " NOTNULL) AND ("
        + Contacts.HAS_PHONE_NUMBER + "=1) AND ("
        + Contacts.DISPLAY_NAME + " != '' ))";
    return new CursorLoader(getActivity(),
        baseUri,    //用于检索内容的 URI
        CONTACTS_SUMMARY_PROJECTION,//要返回的列的列表。传递 null 时，将返回所有列
        select,     //用于声明要返回哪些行，其格式为 SQL WHERE 子句（WHERE 本身除外）
        null,       //它将按照在 selection 中显示的顺序替换为 selectionArgs 中的值
        Contacts.DISPLAY_NAME + " COLLATE LOCALIZED ASC"); //行的排序依据
  }
  public void onLoadFinished(Loader<Cursor> loader, Cursor data) {
    mAdapter.swapCursor(data);
    if (isResumed()) {
      setListShown(true);
    } else {
      setListShownNoAnimation(true);
    }
  }
  public void onLoaderReset(Loader<Cursor> loader) {
    mAdapter.swapCursor(null);
  }
}
```

### 初始化 Loader
LoaderManager 可在 Activity 或 Fragment 内管理一个或多个 Loader 实例。每个 Activity 或 Fragment 只有一个 LoaderManager。

初始化 Loader：
使用 `initLoader()` 方法，在 Activity 中的 `onCreate()` 方法或 Fragment 的 `onActivityCreated()` 方法

```java
/*
* 第一个参数用于标识加载器的唯一 ID。此例中为 0
* 若类实现了 LoaderManager.LoaderCallbacks 接口，则参数使用 this
*/
getLoaderManager().initLoader(0, null, this);
```
注意：`initLoader()` 方法将返回已创建的 Loader，但不需要获取其引用。LoaderManager 将自动管理 Loader 的生命周期。LoaderManager 将根据需要启动和停止加载，并维护 Loader 的状态及其相关内容。当特殊事件发生时，通常会使用 LoaderManager.LoaderCallbacks 方法干预加载进程。
### 实现 LoaderManager 回调
LodarManager.LoaderCallbacks 包括以下方法：

- `onCreateLoader()`：针对指定的 ID 进行实例化并返回新的 Loader
- `onLoadFinished()`：将在先前创建的 Loader 完成加载时调用
- `onLoaderReset()`：将在先前创建的 Loader 重置且其数据因此不可用时调用

## 源码部分
CursorLoader 内部定义了一个 ForceLoadContentObserver 类的变量，也主要靠这个变量实现异步加载。主要的方法为有：

- loadInBackground()：运行在后台线程，将调用 ContentResolver() 来查询并返回相应的 Cursor

```java
public Cursor loadInBackground() {
  synchronized (this) {
    if (isLoadInBackgroundCanceled()) {
      throw new OperationCanceledException();
    }
      mCancellationSignal = new CancellationSignal();
   }
   try {
     Cursor cursor = getContext().getContentResolver().query(mUri, mProjection, mSelection,
         mSelectionArgs, mSortOrder, mCancellationSignal);
     if (cursor != null) {
         try {
           // Ensure the cursor window is filled.
           cursor.getCount();
           cursor.registerContentObserver(mObserver);
         } catch (RuntimeException ex) {
           cursor.close();
           throw ex;
         }
       }
      return cursor;
   } finally {
     synchronized (this) {
       mCancellationSignal = null;
     }
   }
 }
```
- deliverResult()：运行在 UI 线程中，当有新的数据被传递时会调用这个方法。大部分逻辑都在父类里实现了，所以只要添加少许逻辑。

```java
public void More ...deliverResult(Cursor cursor) {
  if (isReset()) {
     // An async query came in while the loader is stopped
    if (cursor != null) {
      cursor.close();
    }
    return;
  }
  Cursor oldCursor = mCursor;
  mCursor = cursor;
  if (isStarted()) {
    super.deliverResult(cursor);
  }
  if (oldCursor != null && oldCursor != cursor && !oldCursor.isClosed()) {
    oldCursor.close();
  }
}
```
- onStartLoading()：根据请求来启动 Loader
- onStopLoading()：根据请求来停止 Loader

其他还有一些 *onCanceled()*, *onReset()*, *cancelLoadInBackground()* 方法

因为继承自 AysncTaskLoader，所以可以通过 setUpdateThrottle(long) 设置更新间隔

```java
mCursorLoader.setUpdateThrottle(2000); // 2秒钟间隔
```

## 写在最后
AsyncTask 虽然很少会用到了，不过要是对你有所帮助那就算没白写吧（其实我也不知道 Loader 现在是否还会用到。  
我觉得整篇写得很勉强，所以还是一如既往地贴个官方指南吧：

- [加载器](http://developer.android.com/intl/zh-cn/guide/components/loaders.html)
