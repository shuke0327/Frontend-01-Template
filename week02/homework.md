# Task

- 写一个正则表达式 匹配所有 Number 直接量
- 写一个 UTF-8 Encoding 的函数
- 写一个正则表达式，匹配所有的字符串直接量，单引号和双引号

## 1 写一个正则表达式 匹配所有 Number 直接量

```
/[0-9]+|[0-7]+|0[xX][0-9a-fA-F]+|-?\d*\.\d+/
```


## 2 写一个 UTF-8 Encoding 的函数

```
function EncodingUTF8(str) {
  return str.charCodeAt().toString(2)
}
```

## 3 写一个正则表达式，匹配所有的字符串直接量，单引号和双引号

```
/?:[^"]|\.)*"|'(?:[^']|\.)*|^[\u4E00-\u9FA5A-Za-z0-9]+$ /
```