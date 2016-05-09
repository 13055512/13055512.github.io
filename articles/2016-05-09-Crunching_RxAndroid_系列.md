## 前言
原文链接：[Crunching RxAndroid](https://medium.com/crunching-rxandroid)  
该系列现已更新到 Part 8，本文包含 Part 0～4

## Hello World by RxJava
举一个 'Hello World' 的例子，要是有一点了解的话就跳过吧。  
首先，添加依赖(例子使用的版本号不是最新)  
`compile 'io.reactivex:rxandroid:0.24.0'`  
主要角色为 Observable 和 Subscriber。前者负责抛出数据，后者负责接收数据并处理。两者数量为 1：n
```java
//创建一个抛出 “Hello, World!” String 的 Observable
Observable.OnSubscribe observableAction = new Observable.OnSubscribe<String>() {
  public void call(Subscriber<? super String> subscriber) {
    subscriber.onNext(“Hello, World!”);
    subscriber.onCompleted();
  }
};
Observable<String> observable = Observable.create(observableAction);
```
下一步是创建多个 Subscriber，这个例子中将包含两个 Subscriber 以不同的方式展示收到的 问候
```java
Subscriber<String> textViewSubscriber = new Subscriber<String>() {
  public void onCompleted() {}
  public void onError(Throwable e) {}
  public void onNext(String s) {
    txtPart1.setText(s);
  }
};
Subscriber<String> toastSubscriber = new Subscriber<String>() {
  public void onCompleted() {}
  public void onError(Throwable e) {}
  public void onNext(String s) {
    Toast.makeText(context, s, Toast.LENGTH_SHORT).show();
  }
};
```
两个主角都有了之后，然后使用 `subscribe` 就是将他们联系起来，Observable 只有在被订阅的情况下才会产生数据。不知道大家是不是和我一样觉得如果是 subscribeBy 这样更容易理解
```java
// 指定 observable 在主线程运行
observable.observeOn(AndroidSchedulers.mainThread());

// 实现订阅关系
observable.subscribe(textViewSubscriber);
observable.subscribe(toastSubscriber);
```
## Shorten Version
前面的代码实际上可以写的更简略点。RxJava 提供了 Action 和 Func 接口可以使代码更简略一点。Action 可以用于包装无返回值的，而 Func 是用来包装有返回值的
```java
Action1<String> textViewOnNextAction = new Action1<String>() {
  @Override
  public void call(String s) {
    textPart1.setText(s);
  }
}
```
```java
Func1<String, String> toUpperCaseMap = new Func1<String, String>() {
  @Override
  public String call(String s) {
    return s.toUpperCase();
  }
}
```
前面定义了定义了一个 Func 将 Observable 的数据在发送给 Subscriber 前进行转换，但还需要 `map` 这一关键的一步。另外，Observable 只发送一个字符串，所以可以使用 `just` 进一步简化。
```java
Observable<String> singleObservable = Observable.just("Hello,World");
```
将 Observable 和 Subscriber 连起来后应该像这样
```java
singleObservable.observeOn(AndroidSchedulers.mainThread())
    .map(toUpperCaseMap)
    .subscribe(textViewOnNextAction); //subscribe(onNext, onError, onCompleted);
```
这里我们又引入了一个新的部分--`Operator`， map 是很常用的一个。前面讲的例子只是一个字符串，在实际使用中显然不够用，比如我们要处理包含多个字符串的数组，其实只用 `from` 就可以搞定了
```java
Observable<String> oneByOneObservable = Observable.from(manyWords);
```
处理像数组这类，如果不直接用 `from` 在源头上解决，还可以像 map 那样进行转换，此时需要的是 `flatMap` 这个 Operator，它同样能将原先的 Observable 发出的数据转换成另一种，而且更灵活。
```java
Func1<List<String>, Observable<String>> getUrls = new
    Func1<List<String>, Observable<String>>() {
      @Override
      public Observable<String> call(List<String> strings) {
        return Observable.from(strings);
      }
    }
```
现在又有新的需求，需要将所有的字符串合并成一个字符串，并以一个空格作为间隔：此时我们需要用到另一种 Operator —— `reduce`，它将在 Observable 结束发送后，将发送的数据合并
```java
Func2<String, String, String> mergeRoutine = new Func2<String, String, String>(){
  @Override
  public String call(String s, String s1) {
      return String.format("%s %s",s, s1);
  }
}
```
最后将所有的连起来
```java
Observable.just(manyWordList)
    .observeOn(AndroidSchedulers.mainThread())
    .flatMap(getUrls)
    .reduce(mergeRoutine)
    .subscribe(toastOnNextAction);
```

## Lambdas
什么是 Lambdas ？维基上是这么解释的
>在计算机编程中，匿名函数（英语：anonymous function）是指一类无需定义标识符（函数名）的函数或子程序，普遍存在于多种编程语言中。

匿名函数确实能使代码看上去简洁不少，但在学习中也会让你忽略 RxJava 的一些技术细节。因为 Java 直到 Java 8 才支持，所以需要借助 Retrolambda，同时 Retrolambda 作为非官方兼容方案，其向后兼容性和稳定性是无法保障的
```java
parameter -> functionThatWillReturnSomethingUsingThe(parameter)
```

首先请将 Java 版本升级到 1.8.0+，然后添加依赖，引入 [Retrolambda](https://github.com/orfjackal/retrolambda#gradle-plugin)
```java
buildscript {
    repositories {
        //...
        mavenCentral()
    }
    dependencies {
        //...
        classpath 'me.tatarka:gradle-retrolambda:3.1.0'
    }
}
// Required because retrolambda is on maven central
repositories {
  mavenCentral()
}

apply plugin: 'com.android.application' //or apply plugin: 'java'
apply plugin: 'me.tatarka.retrolambda'
```
我们来看下实际效果吧

- 服用前
```java
Func1<List<String>, Observable<String>> getUrls = new
    Func1<List<String>, Observable<String>>() {
      @Override
      public Observable<String> call(List<String> strings) {
        return Observable.from(strings);
      }
    }
```
- 服用后
```java
strings -> Observable.from(strings);
// 什么? 你还嫌长? 好好好，满足你
Observable::from
```

再补充一个长点的
```java
Observable.just("Hello, World!")
    .observeOn(AndroidSchedulers.mainThread())
    .map(String::toUpperCase)
    .subscribe(txtPart1::setText);
Observable.from(manyWords)
    .observeOn(AndroidSchedulers.mainThread())
    .subscribe(message -> Toast.makeText(context, message, Toast.LENGTH_SHORT).show());
Observable.just(manyWordList)
    .observeOn(AndroidSchedulers.mainThread())
    .flatMap(Observable::from)
    .reduce((s, s1) -> String.format("%s %s", s, s1))
    .subscribe(message -> Snackbar.make(rootView, message, Snackbar.LENGTH_LONG).show());
```
## A real sample
这个部分包含作者的软广部分，我才不会贴链接[。](http://tiwiz.github.io/WhatSong/)
所涉及的的实现功能有：

- take the list of supported providers
- for each of the providers, check if they are installed
- if they are not, remove it from the list
- return the list of installed (and supported) providers

用 Rx 的方式实现的话，首先获得所有音乐所能识别的 packages
```java
Observable.from(softwarePackages);
```
然后创建另一个 Observable 用于包含 software names，用于创建 [PackageData](https://github.com/tiwiz/WhatSong/blob/develop/app/src/main/java/it/tiwiz/whatsong/utils/PackageData.java) 类
```java
softwareNamesObservable = Observable.from(softwareNames);
```
现在我们有两个 Observables 分别用于产生 packages 列表和名字，使用一个 Operator：`zipWith` 将它们链接起来，将后者作为参数。
```java
Observable.from(softwarePackages)
    .zipWith(softwareNamesObservable, PackageData::new)
```
这样就从一个 Observable 那得到了 PackageData，但我们现在还需要筛选出符合的结果。此时需要另一个 Operator：`filter`，设定判定条件，筛选出符合条件的
```java
private static boolean isAppInstalled(final Context context, String packageName) {
  boolean isAppInstalled = true;
  try {
    context.getPackageManager().getPackageInfo
        (packageName, PackageManager.GET_ACTIVITIES);
  } catch (Exception e) {
    isAppInstalled = false;
  }
  return isAppInstalled;
}
```
这样我们就能得到从结果中筛选出本机已安装的
```java
Observable.from(softwarePackages)
    .zipWith(softwareNamesObservable, PackageData::new)
    .filter(PackageData ->
        isAppInstalled(context, PackageData.getPackageName()))
```
剩下的部分就是选择在那个线程上执行，这里需要将 Observable 的 subscribe 运行在 I/O 线程，
Subscriber 的处理结果在 UI 线程上
```java
Observable.from(softwarePackages)
    .zipWith(softwareNamesObservable, PackageData::new)
    .filter(PackageData ->
        isAppInstalled(context, PackageData.getPackageName()))
    .subscribeOn(Schedulers.io())
    .observeOn(AndroidSchedulers.mainThread());
```
现在我们成功筛选本机上已安装的所支持的 providers 在后台线程中，并将结果传递到主线程上。最后我还需要创建一个 Subscriber 在主线程上处理传递过来的数据。
```java
//接上面部分
.subscribe(Subscribers.create(
    (installedApps::add),
    (thowable -> { /* on error */ }),
    (this::convertInstalledAppsListToVector) ));
```

## 总结
如果你对 RxJava 想进一步了解，推荐看下

- 扔物线的[给 Android 开发者的 RxJava 详解](http://gank.io/post/560e15be2dca930e00da1083)
