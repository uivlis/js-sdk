import { handleAPIResponse } from '../util/api'

type Options = {
    token: string
    mesgConfig: any
    client
}

class Service {
  // api gives access to low level gRPC calls.
  api

  private token: string
  private mesgConfig: any
  private tasks: Tasks

  constructor(options: Options){
    this.mesgConfig = options.mesgConfig;
    this.api = options.client;
    this.token = options.token;
  }

  listenTask({ ...tasks }: Tasks): Stream<TaskData> {
    if (this.tasks) {
      throw new Error(`listenTask should be called only once`);
    }
    this.tasks = tasks;
    this.validateTaskNames();
    const stream = this.api.listenTask({ token: this.token });
    stream.on('data', this.handleTaskData.bind(this));
    return stream;
  }

  emitEvent(event: string, data: any): Promise<EmitEventReply | Error> {
    return new Promise<EmitEventReply | Error>((resolve, reject) => {
      this.api.emitEvent({
        token: this.token,
        eventKey: event,
        eventData: JSON.stringify(data)
      }, handleAPIResponse(resolve, reject));
    })
  }

  private handleTaskData({ executionID, taskKey, inputData }) {
    const callback = this.tasks[taskKey];
    if (!callback) {
      throw new Error(`Task ${taskKey} is not defined in your services`);
    }

    const data = JSON.parse(inputData);
    const outputs = {};
    const taskConfig = this.mesgConfig.tasks[taskKey];

    for (let outputKey in taskConfig.outputs){
      outputs[outputKey] = (data: TaskOutputCallbackInput): Promise<SubmitResultReply | Error> => {
        return new Promise<SubmitResultReply | Error>((resolve, reject) => {
          this.api.submitResult({
            executionID,
            outputKey,
            outputData: JSON.stringify(data)
          }, handleAPIResponse(resolve, reject));
        })
      }
    }

    callback(data, outputs);
  }

  private validateTaskNames(){
    const nonDescribedTasks = Object.keys(this.tasks).filter(x => !this.mesgConfig.tasks[x]);
    if (nonDescribedTasks.length > 0){
      throw new Error(`The following tasks does not present in your mesg.yml: ${nonDescribedTasks.join(', ')}`);
    }
    const nonHandledTasks = Object.keys(this.mesgConfig.tasks).filter(x => !this.tasks[x]);
    if (nonHandledTasks.length > 0){
      throw new Error(`The following tasks described in your mesg.yml don't have callbacks: ${nonHandledTasks.join(', ')}`);
    }
  }
}

interface Tasks {
  [task: string]: (inputs: TaskInputs, outputs: TaskOutputs) => void
}

interface TaskInputs {
  [key: string]: any
}

interface TaskOutputs  {
  [key: string]: (input: TaskOutputCallbackInput) => Promise<void>
}

interface TaskOutputCallbackInput {
  [key: string]: any
}

declare interface Stream<T> {
  on(event: 'data', listener: (data: T) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (e) => void): this;
  on(event: 'status', listener: (status) => void): this;
  on(event: 'metadata', listener: (metadata) => void): this;
  cancel(): void
  destroy(err?: Error): void
}

interface EmitEventReply {
}

interface SubmitResultReply {
}

interface TaskData {
  executionID: string
  taskKey: string
  inputData: string
}

export default Service;
export {
  Options,
  Tasks,
  TaskInputs,
  TaskOutputs,
  TaskOutputCallbackInput,
  Stream,
  EmitEventReply,
  SubmitResultReply,
  TaskData,
}
