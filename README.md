# My-Image-Gallary-backend

the backend of My-Image-Gallary.

## Usage

```bash
pnpm i
pnpm start
```

By default the application runs in `.app`, use the `APP_HOME` environment variable to customise.

## Config

create a `config.toml` in the `.app`. the following is an exampel.

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

you should install the database client manually via pnpm in production environment.

We carry a `better-sqlite3` as the default database for the test environment in our development dependencies.
