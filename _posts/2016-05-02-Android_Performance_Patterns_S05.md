---
layout: post
title:  Android Performance Pattern S05
categories: Android
tags: [Thread,Note]
---
# Android Performance Pattern S05
更新时间：2016-05-02

## 前言
这篇算是 [Android Performance Pattern 第5季](https://www.youtube.com/playlist?list=PLWz5rJ2EKKc9CBxr3BVjPTPoDPLdPIFCE)的笔记，内容主要涉及多线程的使用。本人接触 Android 的时间也不久，如有什么错误，希望能指出。

## Thread Performance
线程操作是 Android 开发中的重要组成部分，想要尽可能使你的 App 能尽可能的流畅、迅捷，就自然需要理解并掌握。

为了保持用户界面流畅，即要保证60帧的刷新频率，每16ms 就要绘制一帧。但如果因为有些耗时较长的事件造成，有个16ms 没有绘制，即出现丢帧现象。此时用户就会感到卡顿。
![UI Thread](/assets/2016-05/UIDrawing.png)

解决方案就是将耗时较长的放到另一个线程里运行，主线程能保证页面的流畅  
![Use Work Thread](/assets/2016-05/useWorkThread.png)

Android 框架关于多线程提供了以下这些选择，每个类都有相应的使用场景，这个部分在视频中反复出现：

- AsyncTask : Helps get work on/off the UI thread
- HandlerThread : Dedicated thread for API callbacks
- ThreadPool : Running lots of parallel work
- IntentService : Helps get intents off the UI thread

## Understanding Android Threading
一个普通的线程包含三个部分：1.Thread Begin 2.Do Work 3.Thread Ends  
完成任务后线程会结束掉，为了保证线程运行，所以需要一些循环体（自己控制何时结束），从而可以保持运行。另外你还需要一些 WorkQueue 来支持添加新的任务到工作线程中。
![workThread](/assets/2016-05/WorkThread.png)

如果这些部分都要自己完成会比较麻烦，好在 Android 也相应提供了一些类可使用。

- Lopper 类：可以保证线程处于持续活动状态，同时支持接收 `work` 从消息队列中  
![looper类](/assets/2016-05/Looper.png)
- Handler 类：还支持将新的 `work` 插入到消息队列中的任意位置，而不是想 Looper 那样只能插入到队列末尾  
![Handler 类](/assets/2016-05/Handler.png)

另外在 Android 中的消息队列包含 Intent/runnable/message

![MessageQueue](/assets/2016-05/MessageQueue.png)

把以上所有结合起来，叫做 HandlerThread，在实际 App 中，MainThread 就是一个 Handler Thread

![HandlerThread](/assets/2016-05/HandlerThread.png)

## Memory & Threading
UI objects 不会是线程安全（Thread safe）的，UI objects 被期望运行于 UI 线程上，所以不能保证其在其他线程上运行良好，可能会抛出异常，造成客户端停止工作

![UI objects](/assets/2016-05/UI_OtherThread.png)

在工作线程（worker thread）上持有 UI 引用也可能会造成问题。举个例子，工作线程上持有了一个 UI 的引用，但在这个线程完成之前，这个所持有的 UI 在 UI 线程上被移除

![持有 View 的错误例子](/assets/2016-05/Error_holdViewReference.png)

同样对于持有 Activity 的引用的工作线程也可能会造成内存使用方面的问题，比如当 Activity 被销毁时，这个工作线程却没结束会造成 Activity 无法被回收。比如内部类隐式地持有外部类对象的引用

```java
public class MainActivity extends Activity {
    public class MyAsyncTask extends AsyncTask<Void, Void, String> {
        @Override
        protected String doInBackground(Void... params) {...}
        //...
        @Override
        protected void onPostExecute(String result) {...}
    }
}
```

那我们该如何从工作线程更新 UI 呢？答案是，在 UI 线程中将将工作线程所要用的 UI 和相应的回调接口进行绑定，当工作线程完成后，通过回调接口进行 UI 的更新，同时若此时相应的 UI 已不存在，那这个相应的 work 就会被丢弃；若 Activity 重新初始过，也不会持有被丢弃的 work 的引用

![正确的更新UI](/assets/2016-05/useWorkRecords.png)

## 如何正确地使用线程

### Good AsyncTask Hunting
![AsyncTask](/assets/2016-05/AsyncTask.png)  
使用 AsyncTask 主要涉及到三个方法：`onPreExecute()`、`doInBackground()`、`onPostExecute()`，使用起来很容易，但在实际使用时还要考虑以下问题

问题一：所有 AsyncTask 共享同一个线程，如果前面这个 AsyncTask 没有完成，后面的只能一直处于阻塞状态  
![共享同一个线程](/assets/2016-05/AsyncTask_One_Thread.png)

不过还好，我们可以使用 AsyncTask.executeOnExecutor 来解决这个共享线程的问题，不过对于这种情况，你或许会选择使用 Thread pool  
![使用多个线程](/assets/2016-05/AsyncTask_Multi_Threads.png)

问题二：如何取消 AsyncTask 中的 work？  
AsyncTask 虽然提供了 `cancel` 方法，它实际上做了两件事，检查 `cancel flag` 和在运行结束后通知其结果是无效的。

```java
doInBackground(..) {
    //...
    If (isCancelled()) {...}

        For (i < objs.length)
            If (isCancelled()) {...}
}
```

![AsyncTask 取消](/assets/2016-05/cancelAsyncTask.png)

### Getting a HandlerThread
在实际使用中，AsyncTask 能胜任绝大多数的任务，但有些情况下并不适合，比如使用相机操作时要调用
 `onPreviewFrame()` 回调接口  
![AsyncTask 处理回调](/assets/2016-05/AsyncTask_Callbacks.png)

而 HandlerThread 则刚好胜任，HandlerThread 是一个运行时间很久的、从队列中获取 Task 并执行的线程。很适合耗时很长的回调的处理，还要注意的是应该根据所要操作的 work 的类别设定相应的优先级。前面已经贴过一次图了，这里再贴一次  
![HandlerThread](/assets/2016-05/HandlerThread.png)

回到使用相机操作这个场景中，在 HandlerThread 中执行 camera.open() 调用 `onPreviewFrame()` 接口，获得数据后在通过 `runOnUIThread` 在 UI 线程上进行相应的更新  
![HandlerThread 处理回调](/assets/2016-05/HandlerThread_Callbacks.png)

### Swimming in ThreadPools
当要处理很多线程时，要考虑使用 ThreadPoolExecutor 类，它能帮你轻松地解决多个线程之间的工作  
![ThreadPools](/assets/2016-05/ThreadPoolExecutor.png)

但具体需要多少个线程才比较好呢？因为 CPU 能同时处理的线程数是有限的，当线程数超过一定值后，并不能提高计算速度，相反还会造成内存空间的紧张。好在 ThreadPoolExecutor 帮我们解决了这个问题

```java
private static int NUMBER_OF_CORES = Runtime.getRuntime().availableProcessors();
mDecodeThreadPool = new ThreadPoolExecutor(
        NUMBER_OF_CORES>>1,     // Initial pool size
        NUMBER_OF_CORES,        // Max pool size
        KEEP_ALIVE_TIME,        // Keep alive time
        KEEP_ALIVE_TIME_UNIT,   // Keep alive units (seconds etc)
        mDecodeWorkQueue);
```

### The Zen of IntentService
对于没有 UI 的 Service，AsyncTask 并不适合，同样对于 HandlerThread 对于一直没有收到 Intent 时则会一直占用资源，这是就应该使用 IntentService，而它是一种 Service 类和 HandlerThread 类的混合，继承自 Service 类，内部实现了 HandlerThread 处理 Intent

作为 Service 的一面，比如可以使用 Alarms 设置重复的工作  
![作为 Service](/assets/2016-05/IntentService_Service.png)

作为 HandlerThread 的一面，IntentService 可以使用 runOnUIThread 切换到在主线程中使用 BroadcastReciever 来处理  
![作为 HandlerThread](/assets/2016-05/IntentService_HandlerThread.png)

## Threading and Loaders
![Activity 提前销毁](/assets/2016-05/Activity_No_Loader.png)

对于我们要处理的 Activity 不再活跃时，可以使用 Loader 来解决。

![使用 Loaders](/assets/2016-05/Activity_Loader.png)

具体来看，我们请求 Activity 通过一个 LoaderManager 的对象，它将确保我们能得到正确的信息，当 Activity 的生命周期发生变化时，同样当原来的 Activity 从栈中移除并无法再返回时，LoaderManager 会通过回调接口告诉你这个结果将无法被使用，然后我们就能继续进一步的资源释放操作  
![成功情况下](/assets/2016-05/Loader_Success.png)

## The Importance of Thread Priority
CPU 能同时处理的线程数是有限的，所以超出数量后，会依据优先级选择执行线程。使用 `android.os.Process.setThreadPriority(int)` 来设置优先级[-20,20]，数字越低，优先级越高。默认情况下，同一组的优先级是一样的，所以我们需要根据需要做出调节

![例子](/assets/2016-05/Base_State_Value.png)
