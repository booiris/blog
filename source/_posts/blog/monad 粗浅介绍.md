---
title: monad 粗浅介绍
date: 2023-12-12 21:20:47
updated: 2024-01-12 23:25:03
tags: 
top: false
mathjax: true
categories:
  - blog
author: booiris
---

## 什么是 monad?

monad(单子) 是函数式编程中的一种抽象，本文旨在对 monad 的粗浅介绍，所以跳过其数学上的定义和结构性证明(其实是目前笔者也不太懂🤫)，通过一些具体的例子说明它的概念和作用。

### 定义

尽管没有太复杂的数学概念，但还是需要一个定义说明什么样的东西才能称之为 monad。在接下来的说明中，除了列举出数学定义以外，还有其在 go 语言中的具体表现形式。在 wiki 的定义中:

> [Monad (functional programming) - Wikipedia](https://en.wikipedia.org/wiki/Monad_(functional_programming)#Definition)

一个 monad 包含三个部分:

1. 类型构造子 `M` 。

	* 在 go 中可以理解为一种名为 `M` 包裹着 `T` 的泛型结构体 `M<T>{ val: T }`

3. 类型转换子 ` Unit :: T -> M T `。

	* 在 go 中可以理解为由值 `T` 构造 `M` 的函数 `func Unit[T any](val T) -> M<T>`

4. 组合子 `>>= or FlatMap :: M T -> ( T -> M U) -> M U` 。

	* 在 go 中可以理解为 `M<T>{ val: T }` 这个结构体具有一个成员方法 `func flatMap[T, U any] (func(T) -> M<U>) -> M<U>` ，能够接受一个函数参数实现从 `M<T>` 到 `M<U>` 的变换。

#### 更严格的定义

一个 monad 还必须含有以下三个约束:

1. 转换子 `Unit` 是组合子 `>>=` 的左[单位元](https://en.wikipedia.org/wiki/Identity_element): `Unit(x) >>= f <-> f(x)` 。

	* 在 go 中可以理解为 `Unit(x).FlatMap(f)` 的执行结果和执行 `f(x)` 结果相同

2. 转换子 `Unit` 是组合子 `>>=` 的右[单位元](https://en.wikipedia.org/wiki/Identity_element): `Mx >>= Unit <-> Mx`

	* 在 go 中可以理解为 `M{ val: x }.FlatMap(Unit)` 的执行结果等于 `M{ val: x }`

3. 组合子 `>>=` 满足结合律: `ma >>= λx -> (f(x) >>= λy -> g(y)) <-> (ma >>= λx -> f(x)) >>= λy -> g(y)`

	* 在 go 中可以理解为以下两个过程执行结果相等

```go
func F[T, U any](x T) M<U>  { f(x) } // f(x) 是对 x 的一些行为
func G[U, P any](y U) M<P> { g(y) } // g(y) 是对 y 的一些行为

func H[T, P any](x T) M<P> { F(x).FlatMap(G) } // g(f(x))

res1 := M{val: x}.FlatMap(H)
```

```go
func F[T, U any](x T) M<U>  { f(x) } // f(x) 是对 x 的一些行为
func G[U, P any](y U) M<P> { g(y) } // g(y) 是对 y 的一些行为

res2 := M{ val: x }.FlatMap(F).FlatMap(G)
```

## monad 有什么用?

在列举完 monad 的定义后，为了避免陷在抽象的世界里无法自拔，笔者在接下来会具体列举一些例子说明 monad 的作用，帮助更好地说明什么是 monad 。

### 另一个宇宙的 go error monad

在 go 编程中，可能常见如下代码:

```go
// 获取要查询的ID
func GetID (int64) (int64,error) {}
// 获取 ID 对应的信息
func GetInfo (id int64) (Info,error) {}
// 获取上一个 Info 中 uid 对应的信息
func GetUserInfo (Info) (UserInfo,error) {}

func handle() error {
	rawID := 0
	id, err := GetID(rawID)
	if err != nil {
		return err
	}
	info, err := GetInfo(id)
	if err != nil {
		return err
 	}
	userInfo, err := GetUserInfo(info)
	if err != nil {
		return err
	}
	// use userInfo ...
}

```

可以看到 go 的灵魂出现了🤗

![](https://cdn.jsdelivr.net/gh/booiris-cdn/img/20231224210233.png)

当然笔者并不反对 go 这种严格处理每个函数返回的错误值的思想，不过本文既然是有关 monad 的介绍，自然是想着怎么将 monad 套用到 go 的错误处理中。

回顾 monad 的定义:

* 首先 monad 是一个结构体:

```go
type ErrMonad[T any] struct {
	Result T
	Err  error
}
```

上面的结构体包含了返回值和错误。考虑到日常使用中对返回值采用的是和类型(也就是返回了 error 就不使用其他返回值)，

* 然后需要一个由 `T` 构造成 `MT` 的函数:

```go
func Unit[T any] (result T) ErrMonad[T] {
	return ErrMonad[T]{
		Result: result,
	}
}

```

* 有组合子 `FlatMap` 成员方法:

```go
func (h ErrMonad[T]) FlatMap[U] (mapFunc func(T) ErrMonad[U] ) ErrMonad[U] {
	if h.err != nil{
		return h
	}
	// 假设 mapFunc 有效
	res := mapFunc(h.result)
	return Unit(res)
}
```

有了上述实现后，之前的流程就可以改写为:

```go
// 获取要查询的ID
func GetID (int64) (int64,error) {}
// 获取 ID 对应的信息
func GetInfo (id int64) (Info,error) {}
// 获取上一个 Info 中 uid 对应的信息
func GetUserInfo (Info) (UserInfo,error) {}

func handle() error {
	rawID := Unit(int64(0))
	res := rawID.
			FlatMap(GetID).
			FlatMap(GetInfo).
			FlatMap(GetUserInfo)
	if res.Err != nil{
		return res.Err
	}
	userInfo = res.Result
	// use userInfo ...
}

```

可以看出相较于之前的版本，代码更简洁了一些 (至少少了 `if err != nil { return err }`)。

然而理想是美好的，看着 monad 实现这么简单，为啥群友总说 go 不支持 monad 呢。回看本节标题 "**另一个宇宙**的 go error monad"，非常遗憾的是，在本宇宙中 go 的大道至简使得它不支持一个泛型特性: 方法中不能
[Type Parameters Proposal](https://go.googlesource.com/proposal/+/master/design/43651-type-parameters.md#no-parameterized-methods)

[proposal: spec: allow type parameters in methods · Issue #49085 · golang/go · GitHub](https://github.com/golang/go/issues/49085)

### monad 如何解决回调地狱

现在让我们来看看一点老东西。

### monad 在流式处理中的应用

## 总结

## 相关阅读

* [Haskell Monad\_哔哩哔哩\_bilibili](https://www.bilibili.com/video/BV17E411F7cH/)

* [Functors, Applicatives, And Monads In Pictures - adit.io](https://www.adit.io/posts/2013-04-17-functors,_applicatives,_and_monads_in_pictures.html)

* [什么是 Monad (Functional Programming)？ - Belleve的回答 - 知乎 🤣](https://www.zhihu.com/question/19635359/answer/62415213)

* [深入理解函数式编程（上） - 美团技术团队](https://tech.meituan.com/2022/10/13/dive-into-functional-programming-01.html)

* [深入理解函数式编程（下） - 美团技术团队](https://tech.meituan.com/2022/10/13/dive-into-functional-programming-02.html)
