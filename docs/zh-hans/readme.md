# My-Image-Gallary-backend

我的图片库仓库的后端部分

## 使用方法

```bash
pnpm i
pnpm start
```

默认情况下，应用程序在`.app`目录下运行，可以通过设置`APP_HOME`环境变量来自定义路径。

## 配置

配置在`.app`目录下创建一个`config.toml`文件。以下是一个示例。

```toml
[network]
[app]
image_folder = "images"
compressed_images_folder = "compressed_images"
[database]
client = "better-sqlite3"
useNullAsDefault = true
connection.filename= "example.db"
```

您应该在生产环境中通过`pnpm`手动安装数据库客户端。

我们在开发依赖中携带了`better-sqlite3`作为测试环境的默认数据库。
