---
layout: post
title: Crunching RxAndroid 系列 | 译
categories: Android
tags: [RxJava, RxAndroid, 译]
---

# Crunching RxAndroid 系列【译】
更新时间：2016-05-16

## 前言
原文链接：[Crunching RxAndroid](https://medium.com/crunching-rxandroid)  
该系列现已更新到 Part 8，本文包含 Part 0～8

## Hello World by RxJava
举一个 'Hello World' 的例子，要是有一点了解的话就跳过吧。  
首先，添加依赖(例子使用的版本号不是最新)

```
compile 'io.reactivex:rxandroid:0.24.0'
```  
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
这里我们又引入了一个新的部分：`Operator`， map 是很常用的一个。前面讲的例子只是一个字符串，在实际使用中显然不够用，比如我们要处理包含多个字符串的数组，其实只用 `from` 就可以搞定了

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
现在又有新的需求，需要将所有的字符串合并成一个字符串，并以一个空格作为间隔：此时我们需要用到另一种 Operator ： `reduce`，它将在 Observable 结束发送后，将发送的数据合并

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

## Retrofit and RxJava
// TODO

## RxLifecycle
RxJava 很好用，但如果不注意使用也会有风险，比如当 App 生命周期发生变化时，未完成的 subscriptions 可能会造成内存泄露。不过在 [RxLifecycle](https://github.com/trello/RxLifecycle) 的帮助下，这个将不再是问题。使用 RxLifecycle 需要继承 RxActivity, RxAppCompatActivity, RxFragment 这三者之一或选择提供一个 `Observable<ActivityEvent>` 或 `Observable<FragmentEvent>`

无论你选择何种，最后实现起来是类似的。有了 RxLifecycle，我们的 Observable 的生命周期可以和 Activity 或 Fragment 的生命周期联系在一起。换句话说，如果我们在 onResume 阶段启动 Observable， RxLifecycle 将会保证这个 Observable 在 onPause 阶段取消 subscribe。如果还不太理解的话看下下面的栗子，反之就看下一节吧。

### 一个栗子
现在有这么一段程序，在 Activity 运行期间会一直打 Log，同时在 Activity 进入到 onPause 阶段时停止，另一方面，我们想办法让 Observable 在 Activity 处于活动时一直运行（废话讲太多了，还是直接看图吧）。可以在[这里](https://github.com/tiwiz/RxAndroidCrunch)找到全部代码

```java
Observable.interval(1, TimeUnit.SECONDS)
    .observeOn(AndroidSchedulers.mainThread())
    .subscribe(this::logOnNext,this::logOnError,this::logOnCompleted);
```

『The sun is rising!』表示进入 onPause 阶段,最后程序跑起来的样子：

![效果图](/assets/2016-05/NoRxLifecycle.png)

结果很明显， Observable 并没有及时地停止，这就是前面提到的我们在使用时需要注意的。

下面自然是需要给出使用 RxLifecycle 后的结果，RxLifecycle 会在适当时机调用 onCompleted 方法来停止 Observable。

```java
// 首先要继承
public class Part5Activity extends RxAppCompatActivity {}
```
为了绑定到生命周期，可以自动的或使用静态方法 `bindUntilActivityEvent`，这里我们就使用前者。

```java
Observable.interval(1, TimeUnit.SECONDS)
    .observeOn(AndroidSchedulers.mainThread())
    .compose(bindToLifecycle())
    .subscribe(this::logOnNext, this::logOnError,this::logOnCompleted);
```

最后补张图

![RxLifecycle is good!](/assets/2016-05/UseRxLifecycle.png)

## RxBinding
[RxBinding](https://github.com/JakeWharton/RxBinding)是 Jake Wharton 大神的作品。这部分讲的是绑定，道理我有点讲不通，差不多的内容为 Android 官方的 [Data Binding](http://developer.android.com/tools/data-binding/guide.html)实现绑定后就不用再写什么 findViewById 了。

这个库背后的原理是提供了一个 Observable 当我们所感兴趣的事件发生时被启动。例如，我们对 FAB 的点击事件比较感兴趣：

```java
RxView.clicks(fab).subscribe(aVoid -> onFabClicked());
```

类似的还有 `RxToolbar,itemClicks()`,`RxView.navigationClicks()`。随着库的更新，所支持的也会越来越多。

最后我们来个更常用的例子，也就是监听 EditText 的输入，并对每一次输入前，时，后做出相应的处理。

```java
usualApproachEditText.addTextChangedListener(new TextWatcher() {
  @Override
  public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

  @Override
  public void onTextChanged(CharSequence s, int start, int before, int count) {
    onNewTextChanged(s);
  }

  @Override
  public void afterTextChanged(Editable s) {}
});
```

```java
RxTextView.textChanges(reactiveApproachEditText).subscribe(this::onNewTextChanged);
```

## Custom Operators
这部分又回到 RxJava 了。在 RxJava 里总共有两类：一种称之为 Sequence Operators,影响原始 Observable 发送的数据，通过使用 `lift()` 来实现。另一种则是像 RxLifecycle 这类改变 Observable 自身，我们称之为 Transformational Operators，通过使用 `compose()` 来实现。自定义 Operators 有比较大的风险，所以这部分只是为了<b>理解</b> Operators。

看下 Operator 接口的定义，我们会发现实际上是输入一个 subscriber<T> 并返回一个 subscriber<R>，即：我们可以很容易的改变 Observable 发出的数据，但这里有一个坑——需要创建自定义的 Operator，而这又可能造成 subscription 链的断裂和 [back pressure](https://github.com/ReactiveX/RxJava/wiki/Backpressure) 问题。

自定义 Sequence Operators 的第一步要继承 Observable.Operator 类，在这个类的 `call()` 方法返回一个新的 Subscriber。

```java
public class SequenceOperator implements Observable.Operator<Integer, Integer> {
  @Override
  public Subscriber<? super Integer> call(Subscriber<? super Integer> subscriber) {
    return new Subscriber<Integer>(subscriber) {
        @Override
        public void onCompleted() {
          subscriber.onCompleted();
        }

        @Override
        public void onError(Throwable e) {
          subscriber.onError(e);
        }

        @Override
        public void onNext(Integer integer) {
          int roundedSqrt = (int) Math.round(Math.sqrt(integer));
          subscriber.onNext(roundedSqrt);
        }
    };
  }
}
```

自定义 Transformational Operators，将影响 Observable 整个部分。需实现 Transformer 接口，运行到我们想要的线程上，最后返回结果。

```java
public class ObservableTransformer<T> implements Observable.Transformer<T, T> {
  @Override
  public Observable<T> call(Observable<T> observable) {
    return observable.subscribeOn(Schedulers.newThread())
        .observeOn(AndroidSchedulers.mainThread());
    }
}
```

最后，检验下我们实现的。

```java
Observable.just(txtNumber.getText())
    .delay(5, TimeUnit.SECONDS)
    .map(editable -> Integer.parseInt(editable.toString()))
    .lift(new SequenceOperator())
    .map(sqrt -> String.format(“SQRT is %d”, sqrt))
    .compose(new ObservableTransformer<>())
    .subscribe(s -> txtResponse.setText(s),
    throwable -> txtResponse.setText(throwable.getMessage()));
```

## Subjects
总算是有点内容了。到目前为止，我们已经知道一个 Subscriber 可以监听一个 Observable，并对其发出的数据接收和处理。但是，但是如果我们想让他们绑在一起呢？像一条管道，一端为 Observable，另一端为 Subscriber，这个就是我们将要讲的 Subject。

使用 Subject 可以很好的解决之前提到的 subscription 当 Activity 的生命周期发生变化时无法即使保存，也就是，我们可以使用一个 Subject 在 `onCreate()` 阶段 subscribe 我们的 Observable，然后安全的存储这个 Subject，以至于能在设备发生旋转的过程中存活下来，然后能在 `onResume()` 阶段重新接上正确的 Subscriber，这样就能得到结果。

```java
@Override
public void onCreate(@Nullable Bundle savedInstanceState) {
  super.onCreate(savedInstanceState);
  setRetainInstance(true);

  Observable<Integer> source = Observable.interval(1, TimeUnit.SECONDS)
      .map(Long::intValue)
      .take(20);

  subscription = source.subscribe(subject);
}

@Override
public void onResume() {
  super.onResume();
  listener.onObservableRetrieved(subject.asObservable());
}
```

下面介绍几种 subject，在不同的应用场景下使用相应的 subject。

### AsyncSubject
[AsyncSubject](http://reactivex.io/RxJava/javadoc/rx/subjects/AsyncSubject.html) 它将发送原始 Observable 最后一次的结果（再强调一边：只是最后一次的值），并且是在原始 Observable 结束后。如果 Observable 没有发送任何数据， AsyncSubject 也能正常结束。也就是，这个 Subject 不在意接收到多少数据，在意的只是在结束前发送的最后一次数据。当我们之是在意最后一次的结果的话可以使用。

![AsyncSubject](/assets/2016-05/AsyncSubject.png)

### ReplaySubject
[ReplaySubject](http://reactivex.io/RxJava/javadoc/rx/subjects/ReplaySubject.html) 是一种最简单的 Subject，它将 Observable 的数据所有发送给所有 Subscriber 无论先后。不会错过任何信息！

![ReplaySubject](/assets/2016-05/ReplaySubject.png)

### BehaviorSubject
使用 [BehaviorSubject](http://reactivex.io/RxJava/javadoc/rx/subjects/BehaviorSubject.html)，每个 Subscriber 能接收到完成 subscribe 前最近的一次数据。

![BehaviorSubject](/assets/2016-05/BehaviorSubject.png)

### PublishSubject
[PublishSubject](http://reactivex.io/RxJava/javadoc/rx/subjects/PublishSubject.html) 和 BehaviorSubject 挺相似的，不过只能接收完成 subscribe 后的数据。

![PublishSubject](/assets/2016-05/PublishSubject.png)

## 总结
如果你对 RxJava 想进一步了解，推荐看下

- 扔物线的[给 Android 开发者的 RxJava 详解](http://gank.io/post/560e15be2dca930e00da1083)
