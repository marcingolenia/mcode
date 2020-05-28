import React from 'react'
import Layout from '../../components/Layout'
import SubscribeForm from './subscribe-form'

export default class Index extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <Layout>
        <section className="section">
          <div className="container">
            <div className="content">
              <h1>Subscribe to my email 📬 list!</h1>
              <p>And get an email each time a new article is published. I respect your privacy, you can always unsubscribe.</p>
              <SubscribeForm></SubscribeForm>
            </div>
          </div>
        </section>
      </Layout>
    )
  }
}
