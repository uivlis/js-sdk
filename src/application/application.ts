import { CoreClient } from '../client';
import { Stream } from '../client/stream';
import { handleAPIResponse } from '../util/api';
import { 
    EventData,
    ResultData, 
    ExecuteTaskReply, 
    StartServiceReply
} from '../client/core-client';

type Options = {
    client: CoreClient
}

class Application {
    // api gives access to low level gRPC calls
    api: CoreClient

    private client: CoreClient
    private serviceIDs: string[] = []

    constructor(options: Options){
        this.client = options.client;
        this.api = this.client;
    }

    async whenEvent(event: Event, task: Task): Promise<Stream<EventData>> {
        await this.startService(event.serviceID);
        await this.startService(task.serviceID);

        if (typeof event.filter === 'string') {
            console.warn("Please use eventKey in order to filter on a specific event");
            event.eventKey = event.filter;
            event.filter = null;
        }
        event.filter = event.filter || ((eventKey, eventData) => true);

        const stream = this.client.listenEvent({
            serviceID: event.serviceID,
            eventFilter: event.eventKey || '*'
        })
        stream.on('data', async ({ eventKey, eventData }) => {
            const filter = event.filter as (eventKey: string, eventData: Object) => boolean;
            const data = JSON.parse(eventData);
            if (filter(eventKey, data)) {
                const inputData = typeof task.inputs != 'function'
                    ? task.inputs || {}
                    : (<(eventKey: string, eventData: Object) => Object>task.inputs)(
                        eventKey,
                        data,
                    );
                const tags = typeof task.tags != 'function'
                    ? task.tags || []
                    : (<(eventKey: string, eventData: Object) => string[]>task.tags)(
                        eventKey,
                        data,
                    )
                await this.executeTask(task.serviceID, task.taskKey, inputData, tags);
            }
        });
        return stream;
    }

    async whenResult(result: Result, task: Task): Promise<Stream<ResultData>> {
        await this.startService(result.serviceID);
        await this.startService(task.serviceID);

        result.filter = result.filter || ((outputKey, outputData) => true);
        
        const stream = this.client.listenResult({
            serviceID: result.serviceID,
            taskFilter: result.taskKey || result.task || '*',
            outputFilter: result.outputKey || result.output || '*',
            tagFilters: result.tagFilters || []
        });
        stream.on('data', async ({ outputKey, outputData, taskKey, executionTags }) => {
            const data = JSON.parse(outputData);
            if (result.filter(outputKey, data, taskKey, executionTags)) {
                const inputData = typeof task.inputs != 'function'
                    ? task.inputs || {}
                    : (<(outputKey: string, outputData: Object,
                        taskKey: string, tags: string[]) => Object>task.inputs)(
                        outputKey,
                        data,
                        taskKey,
                        executionTags
                    )
                const tags = typeof task.tags != 'function'
                    ? task.tags || []
                    : (<(outputKey: string, outputData: Object,
                        taskKey: string, tags: string[]) => string[]>task.tags)(
                        outputKey,
                        data,
                        taskKey,
                        executionTags
                    )
                await this.executeTask(task.serviceID, task.taskKey, inputData, tags);
            }
        });
        return stream;
    }

    private executeTask(serviceID: string, taskKey: string, 
        inputs: Object, tags: string[]): Promise<ExecuteTaskReply | Error> {
        return new Promise<ExecuteTaskReply | Error>((resolve, reject) => {
            this.client.executeTask({
                serviceID: serviceID,
                taskKey: taskKey,
                inputData: JSON.stringify(inputs),
                executionTags: tags
            }, handleAPIResponse(resolve, reject));
        });
    }

    private async startService(id: string) {
        // service is already starting.
        if (this.serviceIDs.indexOf(id) >= 0) {
            return
        }
        this.serviceIDs = [...this.serviceIDs, id];

        try {
            await new Promise<StartServiceReply | Error>((resolve, reject) => {
                this.client.startService({ serviceID: id }, handleAPIResponse(resolve, reject));
            });
        } catch (e) {
            throw new Error(`Error while starting service ${e}`)
        }
    }
}

type Event = {
    // serviceID is service's ID.
    serviceID: string
    
    // eventKey is event key filter.
    eventKey?: string

    // filter callback func is used to filter events by event key and
    // event data before continuing to execute the task.
    // task execution only will be made when filter returned with a true.
    // TODO: deprecate string | in future.
    filter?: string | ((eventKey: string, eventData: Object) => boolean)
}

type Result = {
    // serviceID is service's ID.
    serviceID: string

    // DEPRECATED: Please use taskKey instead
    task?: string

    // taskKey is task key filter.
    taskKey?: string

    // DEPRECATED: Please use outputKey instead
    output?: string

    // outputKey is output key filter.
    outputKey?: string

    // tagFilters is a list of tags to filter results by execution tags in the core's side.
    tagFilters?: string[]

    // filter callback func is used to filter task results by output key, output data, task key and/or tags.
    // task execution only will be made when filter returned with a true.
    filter?: (outputKey: string, outputData: Object, taskKey?: string, tags?: string[]) => boolean
}

type Task = {
    // serviceID is service's ID.
    serviceID: string

    // taskKey is task's key.
    taskKey: string

    // tags is a list of tags associated to an execution.
    // tags can be either a list of static strings or a function that returns a list of strings.
    // function parameters depends the received event type which can be an event or a result.
    // for events: the function will have eventKey and eventData.
    // for results: the function will have outputKey, outputData, taskKey and a list of tags associated with the execution.
    tags?: string[] |
        ((eventKey: string, eventData: Object) => string[]) | 
        ((outputKey: string, outputData: Object, taskKey: string, tags: string[]) => string[])

    // inputs is the task's input data.
    // it can be statically set to have an object literal or a function that returns an object literal.
    // function parameters depends the received event type which can be an event or a result.
    // for events: the function will have eventKey and eventData.
    // for results: the function will have outputKey, outputData, taskKey and a list of tags associated with the execution.
    inputs?: Object | 
        ((eventKey: string, eventData: Object) => Object) | 
        ((outputKey: string, outputData: Object, taskKey: string, tags: string[]) => Object)
}

export default Application;
export {
    Options,
    Event,
    Result,
    Task
}
