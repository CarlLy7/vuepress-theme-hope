---
title: RAG中文档切分的策略有哪些？如何设置chunk size的大小
icon: solar:book-bookmark-minimalistic-bold
author: Carl
date: 2026-01-23
order: 1
---

### 文档切分的策略

​	RAG中常见的文档切分的策略有四种，第一种是固定大小切分：也就是按照固定的token进行切分，不关心语义是否完整。第二种是语义边界区分：语义边界切分会按照段落、句子、章节等自然结构进行切分来保证语义的完整性。第三种是混合策略切分：按照固定token大小进行语义切分。第四种是递归切分：递归切分是先大的语义单元进行切分，如果发现语义单元太大再按照段落进行切分，如果段落切分还是太大再按照句子进行切分...,也就是按照规则层层切分直到满足token大小。

​	chunk size大小的设定是没有固定的，一般推荐是512tokens，因为现在市面上的大部分的Embedding在这个大小的训练上是比较好的，具体的大小最终还是要看你自己的具体场景，不同类型的文档切分的大小是不一样的。而且我们在使用RAG的切分策略的时候，除了指定chunk size的大小，还要指定overlap的大小，overlap是两个chunk之间的重叠部分的大小。一般设置在chunk size大小的10%~20%，大部分场景设置15%是够用的。overlap如果设置的太大会导致出现大量重复的内容，如果设置的太小又会导致两个chunk之间的语义不完整。

### 工程实践中的应用：

1. 技术文档：如果文档中有代码块和表格，你必须将完整的代码块或者是完整的表格保存到一个chunk中的，不应该让代码块和表格在不同的chunk中，所以对于技术类的文档一般都是使用语义切分，让整个代码块在一个chunk中，让一个完整表格在一个chunk中。如果文档中的代码块和表格比较多那么就**推荐使用递归切分方法，将代码块放在切分字符串的最高优先级，如果判断是一个代码块直接存chunk不分块**
2. 对话记录/客服对话：对于这类按照轮次进行对话的文档，上下文依赖很强，一般是按照对话的轮次3-5轮切分放到一个chunk中
3. 论文、研究性文档： 对于论文、研究性文档来说，一般是按照语义完整性进行切分，但是需要注意的是对于文章的“摘要、总结”来说是不进行切分，因为这类文档的摘要和总结是整个文章的精华所以一般不进行切分而且完整存入chunk
4. QA问答：一般是逐条存放，这样chunk比较小，检索的粒度需要更小，召回率比较好



> 注意：在**Spring AI** 的文本分割策略中**没有实现**递归分割。Spring AI Alibaba实现了递归切分。

​	

在Spring AI Alibaba对应的递归切分策略的实现中源码如下：

```java
public class RecursiveCharacterTextSplitter extends TextSplitter {
    private final int chunkSize;
    private final String[] separators;

    public RecursiveCharacterTextSplitter() {
        this(1024);
    }

    public RecursiveCharacterTextSplitter(int chunkSize) {
        this(chunkSize, (String[])null);
    }

    public RecursiveCharacterTextSplitter(int chunkSize, String[] separators) {
        if (chunkSize <= 0) {
            throw new IllegalArgumentException("Chunk size must be positive");
        } else {
            this.chunkSize = chunkSize;
            this.separators = (String[])Objects.requireNonNullElse(separators, new String[]{"\n\n", "\n", "。", "！", "？", "；", "，", " "});
        }
    }

    public List<String> splitText(String text) {
        List<String> chunks = new ArrayList();
        this.splitText(text, 0, chunks);
        return chunks;
    }

    private void splitText(String text, int separatorIndex, List<String> chunks) {
        if (!text.isEmpty()) {
            if (text.length() <= this.chunkSize) {
                chunks.add(text);
            } else if (separatorIndex >= this.separators.length) {
                for(int i = 0; i < text.length(); i += this.chunkSize) {
                    int end = Math.min(i + this.chunkSize, text.length());
                    chunks.add(text.substring(i, end));
                }

            } else {
                String separator = this.separators[separatorIndex];
                String[] splits;
                if (separator.isEmpty()) {
                    splits = new String[text.length()];

                    for(int i = 0; i < text.length(); ++i) {
                        splits[i] = String.valueOf(text.charAt(i));
                    }
                } else {
                    splits = text.split(separator);
                }

                String[] var12 = splits;
                int var7 = splits.length;

                for(int var8 = 0; var8 < var7; ++var8) {
                    String split = var12[var8];
                    if (split.length() > this.chunkSize) {
                        this.splitText(split, separatorIndex + 1, chunks);
                    } else {
                        chunks.add(split);
                    }
                }

            }
        }
    }
}
```

如果我们想要利用Spring AI Alibaba实现的这个递归切分来实现代码块不切分也很简单，我们只需要在构建函数中传入我们自定义的优先级的切分字符串

```java
String[] separators=new String[]{"```","\n\n","\n"," ","。","；","!"};
        RecursiveCharacterTextSplitter splitter=new RecursiveCharacterTextSplitter(512,separators);
```





### 更加专业的chunk size大小的确定流程

​	上面不是给了一个比较简单的方法，如果在公司里面真实的chunk size的大小的设定肯定是需要**通过实验得出来的**。首先需要针对这个文档准备一个测试集，比如里面有比较典型的20-30个题目，每个题目人工标注一下对应文档中的哪个部分。然后就可以进行实验了。进行评估的时候主要评估两方面：**召回准确率和答案质量**。其中召回准确率你可以通过召回结果的topK来进行评估，比如你设定只去召回结果中概率最高的5个结果也就是对应的topK=5,你可以看看这五个结果和文档中的内容是不是准确，这个**可以用来评估切分的粒度**。至于答案质量的评估则是将召回的chunk喂给LLM之后看一下LLM生成的答案和我们希望得到的答案是否相近。**答案的质量一般可以用来评估上下文是否够**。而且**往往结果不符合预期的案例反而可以作为我们进行调整chunk size的方向案例**。

​	

**下面我还想补充几种进阶的chunk size调整的方法**

​	跨chunk信息丢失是文档切分中很常见的问题，很难规避。但是我们可以使用多种手段来进行缓解。

​	第一种：大家理所当然都能想到的增大chunk size的大小，让chunk能够包下整个语块。

​	第二种：不改变chunk size的大小而是增大overlap的大小

> 注意：
>
> 第二种的效果是比第一种效果好的。



​	第三种：在chunk中**增加元信息**，比如在chunk中增加对应的章节标题或者上一级标题，这样LLM来读取chunk的时候就知道它的主题是什么了。

​	第四种：匹配到chunk之后不止返回这个匹配的chunk，而是将附近的多个chunk一起给LLM

​	第五种：这个方案比较有技巧性了，**先按照大chunk来进行切分，然后再按照小chunk来进行切分，然后维护一个小chunk和大chunk的映射关系**。这样可以在匹配的时候去匹配小chunk匹配到小chunk之后给LLM的是对应映射的大chunk。

​	

> 最后补充一点就是，chunk越小匹配精度越高，但是可能会导致喂给LLM的时候缺失上下文。chunk太大导致匹配精度差，会有更多的噪声影响召回的准确性