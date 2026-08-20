types of validation
- field level validation: email
- form level validation: password == confirmPass
- model level validation: unique data from db
- api level validation: JSON payloads

best practices for validation in code
- validate at the right level: front end & back end validation
- don't over rely on fe validation: add more robust validation on the server side
- use built-in validation features: utilize the library 
- centralize complex validation logic: use func or variable to store statement (reusable)
- fail fast and provide clear error messages: error first (validation) then proceeding the business flow
- ensure security with input validation: using parameter on query sql (to avoid sql injection)
