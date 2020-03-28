import React from 'react'
import logo from '../img/logo.png'
import twitter from '../img/social/twitter.svg'
import linkedin from '../img/social/linkedin.svg'

const Footer = class extends React.Component {
  render() {
    return (
      <footer className="footer has-background-black has-text-white-ter">
        <div className="footer-items">
          <div className=""><img src={logo} alt="Kaldi" style={{ width: '18em' }}/></div>
          <div className="social">
            <a title="twitter" href="https://bit.ly/39Wk3YG" target="_blank" rel="noopener noreferrer">
              <img
                className="fas fa-lg"
                src={twitter}
                alt="Twitter"
                style={{ width: '1em', height: '1em' }}
              />
            </a>
            <a title="linkedin" href="https://bit.ly/2uY2b0N" target="_blank" rel="noopener noreferrer">
              <img
                src={linkedin}
                alt="linkedin"
                style={{ width: '1em', height: '1em' }}
              />
            </a>
          </div>
        </div>
        <small>© 2020 MCode Marcin Golenia. All Right Reserved.</small> 
      </footer>
    )
  }
}

export default Footer
