### Getting started
- Download apache drill
- Configure apache drill with the steps below.
- Then run apache drill in embedded mode on your laptop:
```
(apache-drill-folder) $ ./bin/drill-embedded
```
- Run `npm i` and `npm start` and visit `http://localhost:5000`

### Configure Apache Drill

**Configure Cors**
Modify `conf/drill-override.conf` to contain:
```
drill.exec: {
  http: {
    cors: {
      enabled: true,
      allowedOrigins: ["*"],
      allowedMethods: ["GET", "POST", "HEAD", "OPTIONS"],
      allowedHeaders: ["X-Requested-With", "Content-Type", "Accept", "Origin"],
      credentials: true
    }
  }
}
```

**Configure S3**
1 - Modify `conf/core-site.xml` with
```
<configuration>

  <property>
    <name>fs.s3a.access.key</name>
    <value>ENTER_YOUR_ACCESSKEY</value>
  </property>

  <property>
    <name>fs.s3a.secret.key</name>
    <value>ENTER_YOUR_SECRETKEY</value>
  </property>

</configuration>
```

2 - Visit http://localhost:8047/storage and create a new storage plugin the following config.
Replace `MY_S3_BUCKET` with your bucket name.

```
{
  "type": "file",
  "enabled": true,
  "connection": "s3a://MY_S3_BUCKET/",
  "config": null,
  "workspaces": {
    "root": {
      "location": "/",
      "writable": false,
      "defaultInputFormat": null
    },
    "tmp": {
      "location": "/tmp",
      "writable": true,
      "defaultInputFormat": null
    }
  },
  "formats": {
    "psv": {
      "type": "text",
      "extensions": [
        "tbl"
      ],
      "delimiter": "|"
    },
    "csv": {
      "type": "text",
      "extensions": [
        "csv"
      ],
      "delimiter": ","
    },
    "tsv": {
      "type": "text",
      "extensions": [
        "tsv"
      ],
      "delimiter": "\t"
    },
    "parquet": {
      "type": "parquet"
    },
    "json": {
      "type": "json",
      "extensions": [
        "json"
      ]
    },
    "avro": {
      "type": "avro"
    },
    "sequencefile": {
      "type": "sequencefile",
      "extensions": [
        "seq"
      ]
    },
    "csvh": {
      "type": "text",
      "extensions": [
        "csvh"
      ],
      "extractHeader": true,
      "delimiter": ","
    }
  }
}
```

3 - Test that this worked. In the embedded mode console, run these commands:
```
> show schemas;
+----------------------------+
|        SCHEMA_NAME         |
+----------------------------+
| INFORMATION_SCHEMA         |
| cp.default                 |
| dfs.default                |
| dfs.root                   |
| dfs.tmp                    |
| s3-plotly-parquet.default  |
| s3-plotly-parquet.root     |
| sys                        |
+----------------------------+

> use s3-plotly-parquet.root;
+-------+-----------------------------------------------------+
|  ok   |                       summary                       |
+-------+-----------------------------------------------------+
| true  | Default schema changed to [s3-plotly-parquet.root]  |
+-------+-----------------------------------------------------+
1 row selected (1.042 seconds)

> show files;
+----------------------+--------------+---------+---------+--------+--------+--------------+------------------------+------------------------+
|         name         | isDirectory  | isFile  | length  | owner  | group  | permissions  |       accessTime       |    modificationTime    |
+----------------------+--------------+---------+---------+--------+--------+--------------+------------------------+------------------------+
| sample-data.parquet  | true         | false   | 0       |        |        | rwxrwxrwx    | 1969-12-31 19:00:00.0  | 1969-12-31 19:00:00.0  |
+----------------------+--------------+---------+---------+--------+--------+--------------+------------------------+------------------------+
1 row selected (1.007 seconds)

>  select * from `s3-plotly-parquet`.`root`.`sample-data.parquet`;
+------+--------------+--------------+--------------+--------------+--------------+--------------+---------------+---------------+-----------------+-----------------+
| _c0  | my-string-1  | my-string-2  | my-number-1  | my-number-2  |  my-date-1   |  my-date-2   | my-boolean-1  | my-boolean-2  | my-geo-point-1  | my-geo-point-2  |
+------+--------------+--------------+--------------+--------------+--------------+--------------+---------------+---------------+-----------------+-----------------+
| 0    | NYC          | USA          | 1            | 10           | [B@6dd8e64b  | [B@48945548  | true          | true          | [10, 10]        | [-10, -10]      |
| 1    | NYC          | USA          | 2            | 20           | [B@2e86d3c   | [B@361b682b  | true          | false         | [11, 11]        | [-11, -11]      |
| 2    | NYC          | USA          | 3            | 30           | [B@1cdb3a1d  | [B@768f12db  | true          | true          | [12, 12]        | [-12, -12]      |
| 3    | Paris        | France       | 4            | 40           | [B@374f10bb  | [B@5af87c49  | false         | false         | [20, 20]        | [-20, -20]      |
| 4    | Paris        | France       | 5            | 50           | [B@1f36bed9  | [B@11216e2e  | false         | true          | [21, 21]        | [-21, -21]      |
| 5    | Tokyo        | Japan        | 6            | 60           | [B@5ea46e79  | [B@47a74bd0  | true          | false         | [30, 30]        | [-30, -30]      |
| 6    | Tokyo        | Japan        | 7            | 70           | [B@6dcdf58b  | [B@7787a602  | true          | true          | [31, 31]        | [-31, -31]      |
| 7    | Tokyo        | Japan        | 8            | 80           | [B@a2dc92d   | [B@77a9ea73  | true          | false         | [32, 32]        | [-32, -32]      |
| 8    | SF           | USA          | 9            | 90           | [B@754a38a0  | [B@3f3737bd  | false         | true          | [40, 40]        | [-40, -40]      |
| 9    | Sf           | USA          | 10           | 100          | [B@5bb7e5d7  | [B@63f566a0  | false         | false         | [41, 41]        | [-41, -41]      |
| 10   | Montreal     | Canada       | 11           | 110          | [B@475ecd46  | [B@41d280cf  | true          | true          | [50, 50]        | [-50, -50]      |
+------+--------------+--------------+--------------+--------------+--------------+--------------+---------------+---------------+-----------------+-----------------+
11 rows selected (8.643 seconds)
```
