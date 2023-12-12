---
title: monad 粗浅介绍 
date: 2023-12-12 21:20:47 
updated: 2023-12-13 01:04:21
tags: [] 
top: false
mathjax: true
categories: [ blog ]
author: booiris
---

## 什么是 monad?

monad(单子) 是函数式编程中的一种抽象，本文旨在对 monad 的粗浅介绍，所以跳过其数学上的定义(其实是目前笔者也不太懂🤫)，通过一些具体的例子说明它的概念和作用。

### 定义

尽管没有太复杂的数学概念，但还是需要一个定义说明什么样的东西才能称之为 monad。在 wiki 的定义中:

> [Monad (functional programming) - Wikipedia](https://en.wikipedia.org/wiki/Monad_(functional_programming)#Definition)

一个 monad 包含三个部分:
1. 类型构造子(构造函数) M, 使得能对类型 T 应用函数 func M(T) -> M{inner: T} 
2. 