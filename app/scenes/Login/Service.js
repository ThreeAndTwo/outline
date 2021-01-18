// @flow
import { EmailIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import ButtonLarge from "components/ButtonLarge";
import GoogleLogo from "components/GoogleLogo";
import InputLarge from "components/InputLarge";
import SlackLogo from "components/SlackLogo";
import { client } from "utils/ApiClient";

type Props = {
  id: string,
  name: string,
  authUrl: string,
  isCreate: boolean,
  onEmailSuccess: (email: string) => void,
  onLdapSuccess: (username: string) => void,
};

type State = {
  showEmailSignin: boolean,
  isSubmitting: boolean,
  email: string,
  ldapId: string,
  ldapPassword: string,
  showLdapSignin: boolean,
};

class Service extends React.Component<Props, State> {
  state = {
    showEmailSignin: false,
    isSubmitting: false,
    email: "",
    ldapId: "",
    ldapPassword: "",
    showLdapSignin: false,
  };

  handleChangeEmail = (event: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({ email: event.target.value });
  };

  handleChangeLdap = (event: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({ ldapId: event.target.value });
  };

  handleChangePwdForLdap = (event: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({ ldapPassword: event.target.value });
  };

  handleSubmitEmail = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (this.state.showEmailSignin && this.state.email) {
      this.setState({ isSubmitting: true });

      try {
        const response = await client.post(event.currentTarget.action, {
          email: this.state.email,
        });
        if (response.redirect) {
          window.location.href = response.redirect;
        } else {
          this.props.onEmailSuccess(this.state.email);
        }
      } finally {
        this.setState({ isSubmitting: false });
      }
    } else {
      this.setState({ showEmailSignin: true });
    }
  };

  handleSubmitLdap = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (this.state.showLdapSignin && this.state.ldapId) {
      this.setState({ isSubmitting: true });

      try {
        // console.log("action:", event.currentTarget.action);
        const response = await client.post(event.currentTarget.action, {
          username: this.state.ldapId,
          password: this.state.ldapPassword,
        });
        if (response.redirect) {
          window.location.href = response.redirect;
        } else {
          console.log("login success for ldap");
          this.props.onLdapSuccess(this.state.ldapId);
        }
      } finally {
        console.log("submit failure");
        this.setState({ isSubmitting: false });
      }
    } else {
      this.setState({ showLdapSignin: true });
    }
  };

  render() {
    const { isCreate, id, name, authUrl } = this.props;

    if (id === "email") {
      if (isCreate) {
        return null;
      }

      return (
        <Wrapper key="email">
          <Form
              method="POST"
            action="/auth/email"
            onSubmit={this.handleSubmitEmail}
          >
            {this.state.showEmailSignin ? (
              <>
                <InputLarge
                  type="email"
                  name="email"
                  placeholder="me@domain.com"
                  value={this.state.email}
                  onChange={this.handleChangeEmail}
                  disabled={this.state.isSubmitting}
                  autoFocus
                  required
                  short
                />
                <ButtonLarge type="submit" disabled={this.state.isSubmitting}>
                  Sign In →
                </ButtonLarge>
              </>
            ) : (
              <ButtonLarge type="submit" icon={<EmailIcon />} fullwidth>
                Continue with Email
              </ButtonLarge>
            )}
          </Form>
        </Wrapper>
      );
    }
    if (id === "ldap") {
      if (isCreate) {
        return null;
      }

      console.log("id:", id);
      console.log("name:", name);
      console.log("authUrl:", authUrl);
      console.log("ldap type");
      return (
          <Wrapper key="ldap">
            <Form
                method="POST"
                action="/auth/ldap"
                onSubmit={this.handleSubmitLdap}
            >
              {this.state.showLdapSignin ? (
                  <>
                    <InputLarge
                        type="text"
                        name="ldap"
                        placeholder="Please enter ldapID"
                        value={this.state.ldapId}
                        onChange={this.handleChangeLdap}
                        disabled={this.state.isSubmitting}
                        autoFocus
                        required
                        short
                    />

                    <InputLarge
                        type="password"
                        name="password"
                        placeholder="Please enter password"
                        value={this.state.ldapPassword}
                        onChange={this.handleChangePwdForLdap}
                        disabled={this.state.isSubmitting}
                        autoFocus
                        required
                        short
                    />
                    <ButtonLarge type="submit" disabled={this.state.isSubmitting}>
                      Sign In →
                    </ButtonLarge>
                  </>
              ) : (
                  <ButtonLarge type="submit" icon={<EmailIcon />} fullwidth>
                    Continue with LDAP
                  </ButtonLarge>
              )}
            </Form>
          </Wrapper>
      );
    }

    const icon =
      id === "slack" ? (
        <Logo>
          <SlackLogo size={16} />
        </Logo>
      ) : id === "google" ? (
        <Logo>
          <GoogleLogo size={16} />
        </Logo>
      ) : undefined;

    return (
      <Wrapper key={id}>
        <ButtonLarge
          onClick={() => (window.location.href = authUrl)}
          icon={icon}
          fullwidth
        >
          {isCreate ? "Sign up" : "Continue"} with {name}
        </ButtonLarge>
      </Wrapper>
    );
  }
}

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
`;

const Wrapper = styled.div`
  margin-bottom: 1em;
  width: 100%;
`;

const Form = styled.form`
  width: 100%;
  display: block;
  justify-content: space-between;
`;

export default Service;
