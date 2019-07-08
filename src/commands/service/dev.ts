import Command from '../../root-command'

import ServiceCompile from './compile'
import ServiceCreate from './create'
import ServiceDelete from './delete'
import ServiceLog from './logs'
import ServiceStart from './start'
import ServiceStop from './stop'

export default class ServiceDev extends Command {
  static description = 'Run a service in development mode'

  static flags = {
    ...Command.flags,
    ...ServiceCreate.flags,
    ...ServiceStart.flags,
  }

  static args = [{
    name: 'SERVICE',
    description: 'Path or url ([https|mesg]://) of a service',
    default: './'
  }]

  async run() {
    const {args, flags} = this.parse(ServiceDev)

    const definition = await ServiceCompile.run([args.SERVICE, '--silent'])
    const service = await ServiceCreate.run([JSON.stringify(definition)])
    const envs = (flags.env || []).reduce((prev, value) => [...prev, '--env', value], [] as string[])
    const instance = await ServiceStart.run([service.hash, ...envs])
    const stream = await ServiceLog.run([instance.hash])

    process.once('SIGINT', async () => {
      stream.destroy()
      await ServiceStop.run([instance.hash])
      await ServiceDelete.run([service.hash, '--confirm'])
    })
  }
}
