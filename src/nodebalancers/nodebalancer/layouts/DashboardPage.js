import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router';

import { Card, CardHeader } from 'linode-components/cards';
import { Table } from 'linode-components/tables';
import { List } from 'linode-components/lists';
import { ListBody } from 'linode-components/lists/bodies';
import { LinkCell, ButtonCell } from 'linode-components/tables/cells';
import { Select } from 'linode-components/forms';
import { DeleteModalBody } from 'linode-components/modals';

import { setError } from '~/actions/errors';
import { setSource } from '~/actions/source';
import { showModal, hideModal } from '~/actions/modal';
import { objectFromMapByLabel, getObjectByLabelLazily } from '~/api/util';
import { nodebalancerStats } from '~/api/nodebalancers';
import { nodebalancers } from '~/api';
import Region from '~/linodes/components/Region';
import { dispatchOrStoreErrors } from '~/components/forms';
import LineGraph from '~/components/graphs/LineGraph';
import {
  NODEBALANCER_CONFIG_ALGORITHMS, NODEBALANCER_CONFIG_STICKINESS,
} from '~/constants';


function formatData(datasets, legends) {
  const x = datasets[0].map(([x]) => x);
  const ys = datasets.map(dataset => dataset.map(([, y]) => y));
  return LineGraph.formatData(x, ys, legends);
}

export class DashboardPage extends Component {
  static async preload({ dispatch, getState }, { nodebalancerLabel }) {
    let id;
    try {
      ({ id } = await dispatch(
        getObjectByLabelLazily('nodebalancers', nodebalancerLabel)
      ));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      await dispatch(setError(e));
    }

    try {
      await dispatch(nodebalancerStats([id]));
    } catch (e) {
      // Stats aren't available.
    }
  }

  constructor(props) {
    super(props);

    const stats = props.nodebalancer._stats;
    if (stats) {
      this.graphs = {
        connections: {
          title: 'Connections',
          yAxis: {
            label: 'Connections per second',
            format: p => p.toFixed(1),
          },
          data: formatData([stats.connections]),
          unit: ' connections',
        },
        traffic: {
          title: 'Traffic',
          yAxis: {
            label: 'Bits per second',
            format: r => `${r.toFixed(1)} bits/s`,
          },
          data: formatData([stats.traffic.in, stats.traffic.out],
                           ['In', 'Out']),
          unit: ' bits/s',
        },
      };
    }

    this.state = {
      source: 'connections',
      errors: {},
      saving: false,
    };
  }

  async componentDidMount() {
    const { dispatch } = this.props;
    dispatch(setSource(__filename));
  }

  onChange = ({ target: { name, value } }) => this.setState({ [name]: value })

  deleteNodeBalancerConfig(nodebalancer, config) {
    const { dispatch } = this.props;

    dispatch(showModal('Delete NodeBalancer Config',
      <DeleteModalBody
        onOk={() => {
          const ids = [nodebalancer.id, config.id].filter(Boolean);

          return dispatch(dispatchOrStoreErrors.call(this, [
            () => nodebalancers.configs.delete(...ids),
            hideModal,
          ]));
        }}
        onCancel={() => dispatch(hideModal())}
        items={[`port ${config.port}`]}
      />
    ));
  }

  render() {
    const { nodebalancer, timezone } = this.props;
    const { configs } = nodebalancer._configs;

    const newConfigs = Object.values(configs).map((config) => {
      return {
        ...config,
        protocol: config.protocol.toUpperCase(),
        algorithm: NODEBALANCER_CONFIG_ALGORITHMS.get(config.algorithm),
        stickiness: NODEBALANCER_CONFIG_STICKINESS.get(config.stickiness),
        statusString: `${config.nodes_status.up} up, ${config.nodes_status.down} down`,
      };
    });

    return (
      <div>
        <section>
          <Card header={<CardHeader title="Summary" />}>
            <div className="row">
              <div className="col-sm-2 row-label">
                IP Addresses
              </div>
              <div className="col-sm-10">
                <ul className="list-unstyled">
                  <li>{nodebalancer.ipv4}</li>
                  <li className="text-muted">{nodebalancer.ipv6}</li>
                </ul>
              </div>
            </div>
            <div className="row">
              <div className="col-sm-2 row-label">
                Hostname
              </div>
              <div className="col-sm-10">
                {nodebalancer.hostname}
              </div>
            </div>
            <div className="row">
              <div className="col-sm-2 row-label">
                Region
              </div>
              <div className="col-sm-10">
                <Region obj={nodebalancer} />
              </div>
            </div>
          </Card>
        </section>
        <section>
          <Card
            header={
              <CardHeader
                title="Configs"
                nav={
                  <Link
                    to={`/nodebalancers/${nodebalancer.label}/configs/create`}
                    className="linode-add btn btn-default float-sm-right"
                  >Add a Config</Link>
                }
              />
            }
          >
            <List>
              <ListBody>
                <Table
                  className="Table--secondary"
                  columns={[
                    { textKey: 'port', label: 'Port',
                      cellComponent: LinkCell,
                      hrefFn: function (config) {
                        return `/nodebalancers/${nodebalancer.label}/configs/${config.id}`;
                      },
                    },
                    { dataKey: 'protocol', label: 'Protocol' },
                    { dataKey: 'algorithm', label: 'Algorithm' },
                    { dataKey: 'stickiness', label: 'Session Stickiness' },
                    { dataKey: 'statusString', label: 'Node Status' },
                    {
                      cellComponent: ButtonCell,
                      headerClassName: 'ButtonColumn',
                      onClick: (config) => {
                        this.deleteNodeBalancerConfig(nodebalancer, config);
                      },
                      text: 'Delete',
                    },
                  ]}
                  data={newConfigs}
                  selectedMap={{}}
                />
              </ListBody>
            </List>
          </Card>
        </section>
        <Card header={<CardHeader title="Graphs" />}>
          {!this.graphs ? <p>No graphs are available.</p> : (
            <div>
              <div className="clearfix">
                <div className="float-sm-left">
                  <Select
                    value={this.state.source}
                    name="source"
                    onChange={this.onChange}
                  >
                    <option value="connections">Connections</option>
                    <option value="traffic">Traffic</option>
                  </Select>
                </div>
                <div className="float-sm-right">
                  Last 24 hours
                </div>
              </div>
              <LineGraph
                timezone={timezone}
                {...this.graphs[this.state.source]}
              />
            </div>
          )}
        </Card>
      </div>
    );
  }
}

DashboardPage.propTypes = {
  dispatch: PropTypes.func,
  nodebalancer: PropTypes.object,
  timezone: PropTypes.string,
};

function select(state, ownProps) {
  const params = ownProps.params;
  const nbLabel = params.nbLabel;
  const { timezone } = state.api.profile;

  const nodebalancer = objectFromMapByLabel(state.api.nodebalancers.nodebalancers, nbLabel);

  return { nodebalancer, timezone };
}

export default connect(select)(DashboardPage);
