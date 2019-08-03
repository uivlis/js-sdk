import cli from 'cli-ux'
import {Instance, Service} from 'mesg-js/lib/api/types'

import Command from '../../root-command'

export default class ServiceList extends Command {
  static description = 'List running services'

  static flags = {
    ...Command.flags,
    ...cli.table.flags()
  }

  async run(): Promise<Instance[]> {
    const {flags} = this.parse(ServiceList)
    const {services} = await this.api.service.list({})
    const {instances} = await this.api.instance.list({})
    if (!services) return []
    cli.table<Service>(services, {
      hash: {header: 'HASH', get: x => x.hash},
      sid: {header: 'SID', get: x => x.sid},
      instances: {
        header: 'INSTANCES',
        get: x => ((instances || []) as Instance[])
          .filter(y => y.serviceHash === x.hash)
          .map(y => y.hash)
          .join('\n')
      }
    }, {printLine: this.log, ...flags})
    return instances || []
  }
}
