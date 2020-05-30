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
              <p>And get an email each time a new article is published. I respect your privacy, you can always unsubscribe by clicking the unsubscribe link in the footer of any email you receive from me, or by contacting me using contact form or direct email. By clicking below, you agree that I may process your infromation in accordance with these terms for newsletter purposes only.</p>
              <br/>
              <SubscribeForm></SubscribeForm>
              <br/>
              <p>I use Mailchimp 🐵 as my marketing platform. By clicking to subscribe, you acknowledge that your infromation will be transferred to Mailchimp for processing. Learn more about Mailchimp's privacy practices <a href="https://mailchimp.com/legal/" target="_blank">here</a>.</p>
            </div>
          </div>
        </section>
      </Layout>
    )
  }
}
