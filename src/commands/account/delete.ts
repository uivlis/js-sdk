import {flags} from '@oclif/command'
import {cli} from 'cli-ux'

import Command from '../../account-command'
import services from '../../services'

export default class AccountDelete extends Command {
  static description = 'Delete an existing account'

  static flags = {
    ...Command.flags,
    passphrase: flags.string({
      required: true,
      description: 'Passphrase to unlock your address'
    })
  }

  static args = [{
    name: 'ADDRESS',
    required: true
  }]

  async run() {
    const {args, flags} = this.parse(AccountDelete)

    cli.action.start('Delete account')
    const {data} = await this.executeAndCaptureError(services.account.id, services.account.tasks.delete, {
      passphrase: flags.passphrase,
      address: args.ADDRESS,
    })
    cli.action.stop(data.address)
    return data
  }
}
