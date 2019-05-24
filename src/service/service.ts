import { handleAPIResponse } from '../util/api'
import { Stream } from '../util/grpc';


type Options = {
  token: string
  definition: any
  client
}

class Service {
  // api gives access to low level gRPC calls.
  api

  private token: string
  private definition: any
  private tasks: Tasks

  constructor(options: Options){
    this.definition = options.definition;
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

  emitEvent(event: string, data: EventData): Promise<EmitEventReply> {
    if (!data) throw new Error('data object must be send while emitting event')
    return new Promise<EmitEventReply>((resolve, reject) => {
      this.api.emitEvent({
        token: this.token,
        eventKey: event,
        eventData: JSON.stringify(data)
      }, handleAPIResponse(resolve, reject));
    })
  }

  private async handleTaskData({ executionID, taskKey, inputData }) {
    const callback = this.tasks[taskKey];
    if (!callback) {
      throw new Error(`Task ${taskKey} is not defined in your services`);
    }
    const data = JSON.parse(inputData);
    try {
      const outputs = await callback(data);
      const outputData = JSON.stringify(outputs);
      return this.submitResult({ executionID, outputData });
    } catch (err) {
      const error = err.message;
      return this.submitResult({ executionID, error });
    }
  }

  private submitResult(payload: any)  {
    return new Promise<SubmitResultReply>((resolve, reject) => {
      this.api.submitResult(payload, handleAPIResponse(resolve, reject));
    })
  }

  private validateTaskNames(){
    const nonDescribedTasks = Object.keys(this.tasks).filter(x => !this.definition.tasks[x]);
    if (nonDescribedTasks.length > 0) {
      throw new Error(`The following tasks are not present in the mesg.yml: ${nonDescribedTasks.join(', ')}`);
    }
    const nonHandledTasks = Object.keys(this.definition.tasks).filter(x => !this.tasks[x]);
    if (nonHandledTasks.length > 0) {
      console.warn(`WARNING: The following tasks described in the mesg.yml haven't been implemented: ${nonHandledTasks.join(', ')}`);
    }
  }
}

interface Tasks {
  [task: string]: (inputs: TaskInputs) => TaskOutputs
}

interface TaskInputs {
  [key: string]: any
}

interface TaskOutputs  {
  [key: string]: any
}

interface EventData {
  [key: string]: any
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
  Stream,
  EmitEventReply,
  SubmitResultReply,
  TaskData,
}
