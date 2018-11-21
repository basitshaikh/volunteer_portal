import React from 'react'
import { graphql, compose } from 'react-apollo'
import { connect } from 'react-redux'
import R from 'ramda'
import { NetworkStatus } from 'apollo-client'
import moment from 'moment'

import { graphQLError } from 'actions'

import EventForm from './form'

import EventsQuery from './queries/index.gql'
import EventQuery from './queries/show.gql'
import CreateEventMutation from './mutations/create.gql'

import { withData as withCreateEventType } from '../EventTypes/new.js'

import Loading from 'components/LoadingIcon'

const prepareEventCreation = (event, createEventType, createEvent) => {
  if (event.eventType.id == null) {
    const newEventType = event.eventType.newType
    if (newEventType == null) throw new Error('No event type specified!')
    createEventType({ title: newEventType }).then(response => {
      const eventWithNewEventType = {
        ...event,
        eventType: {
          id: response.data.createEventType.id,
        },
      }
      createEvent(eventWithNewEventType)
    })
  } else {
    createEvent(event)
  }
}

const NewEvent = ({ createEvent, createEventType, data: { networkStatus, eventTypes, offices, organizations } }) =>
  networkStatus === NetworkStatus.loading ? (
    <Loading />
  ) : (
    <EventForm
      eventTypes={eventTypes}
      offices={offices}
      organizations={organizations}
      onSubmit={event => {
        prepareEventCreation(event, createEventType, createEvent)
      }}
    />
  )

const buildOptimisticResponse = ({
  title,
  description,
  eventType,
  organization,
  office,
  location,
  date,
  startsAt,
  endsAt,
  capacity,
}) => ({
  __typename: 'Mutation',
  createEvent: {
    __typename: 'Event',
    id: '-1',
    title,
    description,
    eventType,
    organization,
    office,
    location,
    date,
    startsAt,
    endsAt,
    capacity,
    duration: moment(endsAt).diff(startsAt, 'minutes'),
  },
})

const withData = compose(
  graphql(EventQuery, {
    options: {
      variables: {
        id: '-1',
      },
    },
  }),
  graphql(CreateEventMutation, {
    props: ({ ownProps, mutate }) => ({
      createEvent: event =>
        mutate({
          variables: { input: event },
          optimisticResponse: buildOptimisticResponse(event),
          update: (proxy, { data: { createEvent } }) => {
            const { events } = proxy.readQuery({ query: EventsQuery })
            const withNewEvent = R.append(createEvent, events)
            proxy.writeQuery({ query: EventsQuery, data: { events: withNewEvent } })
          },
        })
          .then(_response => {
            ownProps.history.push('/portal/admin/events')
          })
          .catch(({ graphQLErrors }) => {
            ownProps.graphQLError(graphQLErrors)
          }),
    }),
  })
)

const mapStateToProps = (state, ownProps) => ({})

const withActions = connect(mapStateToProps, {
  graphQLError,
})

export default withActions(withData(withCreateEventType((_, response) => response)(NewEvent)))
