import React, { Component, PropTypes } from 'react';

import { Table, TableRow } from 'linode-components/tables';
import Example from './Example';
import { SchemaTableBody } from './tables';
import { DescriptionCell, FieldCell } from './tables/Cells';

const defaultColumns = [
  { cellComponent: FieldCell, label: 'Field', headerClassName: 'FieldColumn' },
  { label: 'Type', dataKey: 'type', headerClassName: 'TypeColumn' },
  { cellComponent: DescriptionCell, label: 'Description', headerClassName: 'DescriptionColumn' }
];

const enumColumns = [
  { cellComponent: FieldCell, label: 'Value', headerClassName: 'FieldColumn' },
  { cellComponent: DescriptionCell, label: 'Description', headerClassName: 'DescriptionColumn' }
];


export default class MethodResponse extends Component {

  constructor() {
    super();

    this.state = {
      activeSchemaIds: {}
    };
  }

  onClickRow(nestedSchemaId) {
    let { activeSchemaIds }  = this.state;

    if (activeSchemaIds[nestedSchemaId]) {
      delete activeSchemaIds[nestedSchemaId];
    } else {
      activeSchemaIds[nestedSchemaId] = true;
    }

    this.setState({ activeSchemaIds: activeSchemaIds });
  }

  renderNestedSchemaTable(record) {

    let example = null;
    if (record.example) {
      example = (
        <div><Example example={JSON.stringify(record.example, null, 2)} /></div>
      );
    }

    const columns = record.type === 'enum' ? enumColumns : defaultColumns;
    return (
      <div>
        <div>{this.renderSchemaTable(record.schema, columns)}</div>
        {example}
      </div>
    );
  }

  renderSchemaTable(schemaData, columns) {
    const { activeSchemaIds } = this.state;

    return (
      <Table
        renderRowsFn={(columns, data, onToggleSelect, selectedMap) => {
          const rows = [];
          data.forEach((record, index) => {
            if (record.schema) {
              const nestedSchemaId = `${record.name}-${index}`;
              rows.push(<TableRow
                className="NestedSchemaParent"
                key={record.id || index}
                index={index}
                columns={columns}
                onClick={() => { this.onClickRow(nestedSchemaId); }}
                record={record}
              />);
              rows.push(
                <tr id={nestedSchemaId} className={`NestedSchemaRow ${!activeSchemaIds[nestedSchemaId] ? 'collapse' : ''}`}>
                  <td className="NestedSchemaCell" colSpan={columns.length}>
                    {this.renderNestedSchemaTable(record)}
                  </td>
                </tr>
              );
            } else {
              rows.push(<TableRow
                key={record.id || index}
                index={index}
                columns={columns}
                record={record}
              />);
            }
          });

          return rows;
        }}
        className="Table--secondary"
        columns={columns}
        data={schemaData}
      />
    )
  }

  render() {
    const { schema } = this.props;

    return (
      <div className="Method-section MethodResponse">
        <h4><b>Response</b></h4>
        {this.renderSchemaTable(schema, defaultColumns)}
      </div>
    );
  }
}

