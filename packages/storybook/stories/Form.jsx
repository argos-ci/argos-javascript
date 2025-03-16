import React from "react";

export const Form = () => {
  const [submitted, setSubmitted] = React.useState(null);
  if (submitted) {
    return (
      <div>
        <h1>Submitted</h1>
        <p>Email: {submitted.email}</p>
        <p>Password: {submitted.password}</p>
      </div>
    );
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted({
          email: event.target.email.value,
          password: event.target.password.value,
        });
      }}
    >
      <label htmlFor="email">Email</label>
      <input id="email" type="email" name="email" placeholder="Username" />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        name="password"
        placeholder="Password"
      />
      <button type="submit">Submit</button>
    </form>
  );
};
