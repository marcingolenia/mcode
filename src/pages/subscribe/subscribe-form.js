import React, { useState, Fragment } from 'react';
import './subscribe-form.sass';
import { navigate } from 'gatsby-link'
import addToMailchimp from 'gatsby-plugin-mailchimp';

const EmailForm = () => {

  const [email, setEmail] = useState('');
  const [subscriptionResult, setSubscriptionResult] = useState('');

  const handleSubmit = (submitEvent) => {
    submitEvent.preventDefault();
    const form = submitEvent.target
    addToMailchimp(email)
    .then((data) => {
      if(data.result != 'error') {
        navigate(form.getAttribute('action'));
      }
      var msg = data.msg.replace(/<[^>]*>?/gm, '');
      msg = msg.replace('Click here to update your profile', '');
      setSubscriptionResult(msg);
    })
  };

  const handleEmailChange = (event) => {
    setEmail(event.currentTarget.value);
  };

  return (
    <Fragment>
      <form action="/thanks/" onSubmit={handleSubmit} className="SubscribeForm">
        <div className="Wrapper">
          <input
            placeholder="Email address"
            name="email"
            type="text"
            onChange={handleEmailChange}
          />
          <button type="submit">Subscribe</button>
        </div>
      </form>
      <b>{subscriptionResult}</b>
    </Fragment>
  );
};

export default EmailForm;