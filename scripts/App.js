import React, {Component, PropTypes} from 'react';
import Select from 'react-select';
import Codemirror from 'react-codemirror';
require('codemirror/mode/sql/sql');

AWS.config.update({
    accessKeyId: 'AKIAIMHMSHTGARJYSKMQ',
    secretAccessKey: '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',

    // TODO - I think we'll need to retrieve region
    region: 'us-west-2'
});

const s3 = new AWS.S3();
window.s3 = s3;

const APACHE_DRILL_S3_PARQUET_CONFIG_TEMPLATE = s3path => ({
  'type': 'file',
  'enabled': true,
  'connection': `s3a://${s3path}`,
  'config': null,
  'workspaces': {
    'root': {
      'location': '/',
      'writable': false,
      'defaultInputFormat': null
    },
    'tmp': {
      'location': '/tmp',
      'writable': true,
      'defaultInputFormat': null
    }
  },
  'formats': {
    'psv': {
      'type': 'text',
      'extensions': [
        'tbl'
      ],
      'delimiter': '|'
    },
    'csv': {
      'type': 'text',
      'extensions': [
        'csv'
      ],
      'delimiter': ','
    },
    'tsv': {
      'type': 'text',
      'extensions': [
        'tsv'
      ],
      'delimiter': '\t'
    },
    'parquet': {
      'type': 'parquet'
    },
    'json': {
      'type': 'json',
      'extensions': [
        'json'
      ]
    },
    'avro': {
      'type': 'avro'
    },
    'sequencefile': {
      'type': 'sequencefile',
      'extensions': [
        'seq'
      ]
    },
    'csvh': {
      'type': 'text',
      'extensions': [
        'csvh'
      ],
      'extractHeader': true,
      'delimiter': ','
    }
  }
});


const Table = props => {
    const {rows, columns} = props;

    return (
        <table>
            <thead>
                <tr>
                    {columns.map(column => <th>{column}</th>)}
                </tr>
            </thead>

            <tbody>
                {
                    rows.map(row =>
                        <tr>
                            {row.map(cell => <td>{cell}</td>)}
                        </tr>
                    )
                }
            </tbody>
        </table>
    );
}

const RenderParquetFiles = props => {
    const {
        parquetFiles,
        bucketName,
        s3connections,
        configureParquetFile
    } = props;

    function renderParquetFile(parquetPath) {
        const connectionPaths = s3connections
        .filter(config => config.config.enabled)
        .map(config =>
            config.config.connection
        );
        const isConfigured = connectionPaths.indexOf(`s3a://${bucketName}/${parquetPath}`) > -1;
        return (
            <div>
                {isConfigured ? '✓' : 'x'} -
                {parquetPath}
                {isConfigured ? '' :
                    <span>
                        -
                        <a href="#" onClick={() => configureParquetFile(parquetPath)}>
                            configure
                        </a>
                    </span>
                }
            </div>
        );
    }

    return (
        <div>
            {parquetFiles.map(renderParquetFile)}
        </div>
    );

}



const Configuration = props => {
    const {s3connections} = props;

    if (s3connections.length === 0) {
        return <div>No available connections</div>
    } else {
        return (
            <div>
                {s3connections.map(config=>(
                    <div>
                        <b>{config.name}</b> at <i>{config.config.connection}</i>
                    </div>
                ))}
            </div>
        );
    }
}

function generateDefaultQuery(configName, connectionString) {
    const connectionParts = connectionString.split('/');
    const filename = connectionParts[connectionParts.length-1];
    return `SELECT * FROM \`${configName}\`.root.\`${filename}\``;
}
const DEFAULT_QUERY = generateDefaultQuery('your-apache-drill-config', 's3a://your-s3-bucket/your-s3-parquet-filename.parquet');

export default class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            code: DEFAULT_QUERY,
            rows: [[]],
            columns: [],
            querystatus: '',
            s3status: '',
            bucketName: 'plotly-s3-connector-test',
            S3Response: {},
            parquetFiles: [],
            s3connections: []
        };

        this.updateCode = this.updateCode.bind(this);
        this.query = this.query.bind(this);
        this.listS3Objects = this.listS3Objects.bind(this);
        this.getApacheDrillConfiguration = this.getApacheDrillConfiguration.bind(this);
        this.configureParquetFile = this.configureParquetFile.bind(this);
    }

    componentWillMount() {
        this.getApacheDrillConfiguration();
    }

    // set this.state.parquetFiles
    listS3Objects() {
        const {bucketName} = this.state;
        this.setState({s3status: 'loading'});
        s3.listObjects({Bucket: bucketName}, (err, data) => {
            if (err) {
                this.setState({status: `error - ${err}`});
            } else {
                // Filter out the parquet files
                this.setState({s3status: ''});

                if (data.Contents) {
                    const parquetFiles = [];
                    const otherFiles = [];
                    data.Contents.forEach(bucket => {
                        const bucketKey = bucket.Key;
                        // Skip folders
                        if (!bucketKey.endsWith('/')) {
                            if (bucketKey.indexOf('.parquet/') > -1) {
                                // Parquet "files" are really just a folder.
                                // List it as a folder and don't include any of the contents
                                const parquetFile = bucketKey.slice(
                                    0,
                                    bucketKey.indexOf('.parquet') + '.parquet'.length
                                );
                                // since all of the files listed in this folder will be contained
                                // make sure to include this foldername only once
                                if (parquetFiles.indexOf(parquetFile) === -1) {
                                    parquetFiles.push(parquetFile);
                                }
                            } else {
                                otherFiles.push(bucketKey)
                            }
                        }
                    });
                    this.setState({parquetFiles, otherFiles});
                }
            }

        });
    }

    // set this.state.s3connections
    getApacheDrillConfiguration() {
        fetch('http://localhost:8047/storage.json')
        .then(response=>response.json())
        .then(configuration => {
            console.warn('configuration: ', configuration);
            const s3connections = configuration.filter(config =>
                config &&
                config.config &&
                config.config.enabled &&
                config.config.connection &&
                config.config.connection.startsWith('s3a')
            );

            const newState = {apachestatus: '', s3connections};
            if (this.state.code === DEFAULT_QUERY &&
                s3connections.length > 0
            ) {
                const connection = s3connections[0]
                const configName = connection.name;
                const connectionString = connection.config.connection;
                newState.code = generateDefaultQuery(configName, connectionString);
            }

            this.setState(newState);

        })
        .catch(error => {
            console.error(error);
            this.setState({apachestatus: `error = ${error}`});
        });
    }

    configureParquetFile(parquetPath) {
        const {bucketName} = this.state;
        const parquetName = parquetPath
            .replace(/\//, '-')
            .replace(/\./, '-');
        const storageName = `s3-${parquetName}`;
        fetch(`http://localhost:8047/storage/${parquetName}.json`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({
                name: parquetName,
                config: APACHE_DRILL_S3_PARQUET_CONFIG_TEMPLATE(
                    `${bucketName}/${parquetPath}`
                )
            })
        }).then(
            this.getApacheDrillConfiguration
        ).catch(err => {
            console.error(err);
        });
    }

    updateCode(newCode) {
        this.setState({code: newCode});
    }

    query() {
        const {code} = this.state;
        this.setState({querystatus: 'loading'});
        const url = 'http://localhost:8047/query.json';

        fetch(url, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
                'queryType' : 'SQL',
                'query' : code
            })
        }).then(response=>response.json())
          .then(j => {
              if (j.errorMessage) {
                  this.setState({status: j.errorMessage});
              } else {
                  this.setState({
                      rows: j.rows.map(row => j.columns.map(c => row[c])),
                      columns: j.columns,
                      querystatus: ''
                  })
              }
          })
          .catch(error => {
              console.warn(error);
              if (typeof error === 'object' &&
                  error !== null &&
                  error.errorMessage
              ) {
                  this.setState({status: error.errorMessage});
              } else {
                  this.setState({status: 'unknown error'});
              }
          });

    }

    render() {
        const {
            code,
            rows, columns,
            s3status,
            querystatus,
            bucketName,
            parquetFiles,
            s3connections
        } = this.state;

        return (
            <div>

                <h3>Parquet on S3</h3>

                <div>
                    <h5>Configured S3 Parquet Files</h5>
                    <Configuration s3connections={s3connections}/>
                </div>

                <hr/>

                <div>
                    <h5>Add S3 Parquet Configuration</h5>
                    <span>
                        <label>
                            List Your Parquet Files on S3
                        </label>
                        <input
                            type="text"
                            value={bucketName}
                            onChange={e =>
                                this.setState({bucketName: e.target.value})
                            }
                            placeholder="s3 bucket, e.g. plotly-s3-connector-test"
                        />
                        <button onClick={this.listS3Objects}>load</button>
                        {s3status}
                    </span>

                    <RenderParquetFiles
                        parquetFiles={parquetFiles}
                        s3connections={s3connections}
                        configureParquetFile={this.configureParquetFile}
                        bucketName={bucketName}
                    />

                </div>

                <hr/>

                <div>
                    <h5>Query Parquet File</h5>
                    <textarea
                        value={code}
                        style={{width: '100%', height: 100, fontSize: 14, fontFamily: 'monospace'}}
                        onChange={e => this.updateCode(e.target.value)}
                    />

                    <div>
                        <button onClick={this.query}>Query</button>
                        <span>{querystatus}</span>
                    </div>
                </div>

                <div>
                    <Table
                        rows={rows}
                        columns={columns}
                    />
                </div>

            </div>
        );

    }

}
