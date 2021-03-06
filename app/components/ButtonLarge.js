// @flow
import styled from "styled-components";
import Button, { Inner } from "./Button";

const ButtonLarge = styled(Button)`
  height: 40px;
  margin-top: 15px;
  ${Inner} {
    padding: 4px 16px;
  }
`;

export default ButtonLarge;
