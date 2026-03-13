# Kafka1 (Mock Kafka)

## Overview

- Single-cluster, single-node, single-partition in-memory Kafka
- Compatible with kafkajs API subset
- **Consumer**: Subscribes to topics, reads messages via eachMessage callback
- **Producer**: Sends messages to topics/partitions
- **Admin**: Lists topics/groups, describes groups
- **Clock-based polling**: Uses Clock for async message consumption

## Architecture

```mermaid
graph TD
    K1["Kafka1<br/>Single cluster, node, partition<br/>kafkajs API compatible"]
    KRaft["KRaftNode<br/>+ _topicOfName()<br/>+ _groupOfId()"]
    Topic["Topic<br/>- name: string<br/>- partitions: Partition[]"]
    Partition["Partition<br/>- partitionId: number<br/>- _messages: Message[]"]
    Message["Message<br/>- key: string<br/>- value: Buffer/string<br/>- timestamp: number<br/>- headers: object"]

    Role["Role<br/>- tla: string<br/>- kafka: Kafka1<br/>+ connect()<br/>+ disconnect()"]
    Consumer["Consumer<br/>- groupId: string<br/>- _inboxClock: Clock<br/>- _runner: _Runner<br/>+ subscribe()<br/>+ run()"]
    Producer["Producer<br/>+ send()"]
    Admin["Admin<br/>+ listTopics()<br/>+ listGroups()<br/>+ describeGroups()"]
    Runner["_Runner<br/>+ process()<br/>+ start()<br/>+ stop()"]

    ConsumerGroup["ConsumerGroup<br/>- groupId: string<br/>- _groupOffsetsetsMap"]
    GroupOffsets["GroupOffsets<br/>- topic: string<br/>- partitions: offset[]"]

    K1 --> KRaft
    KRaft --> Topic
    KRaft --> ConsumerGroup
    Topic --> Partition
    Partition --> Message

    K1 --> Role
    Role --> Consumer
    Role --> Producer
    Role --> Admin
    Consumer --> Runner
    ConsumerGroup --> GroupOffsets
    Consumer -.uses.-> Clock
```

## Message Flow

```mermaid
sequenceDiagram
    participant Producer
    participant Kafka1
    participant Topic
    participant Consumer
    participant Clock
    participant Handler

    Producer->>Kafka1: producer.send({topic, messages})
    Kafka1->>Topic: _topicOfName(topic)
    Topic->>Topic: partition._messages.push(message)
    Kafka1->>Consumer: update all subscribed consumers
    Consumer->>Clock: _inboxClock.update(timestamp)

    Note over Consumer: Later - consumer polling
    Consumer->>Consumer: _runner.process()
    Consumer->>Consumer: _readTopics({eachMessage})
    Consumer->>Topic: read partition._messages
    Consumer->>Handler: eachMessage callback
    Handler-->>Consumer: async return
    Consumer->>Clock: await _inboxClock.next()
    Clock-->>Consumer: yield next timestamp
```
