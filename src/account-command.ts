import {flags} from '@oclif/command'
import {cli} from 'cli-ux'

import Command from './root-command'

export abstract class WithoutPassphrase extends Command {
  static flags = {
    ...Command.flags
  }

  static SERVICE_NAME = 'EthWallet'
}

export abstract class WithPassphrase extends WithoutPassphrase {
  static flags = {
    ...WithoutPassphrase.flags,
    passphrase: flags.string({
      description: 'Passphrase of the account'
    })
  }

  async getPassphrase(): Promise<string | null> {
    const {flags} = this.parse()
    if (flags.passphrase) return flags.passphrase
    return cli.prompt('Type the passphrase of the account', {type: 'hide'})
  }
}
