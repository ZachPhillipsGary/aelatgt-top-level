// Provider: Uses the default profile in ~/.aws/credentials 
provider "aws" {
  version = "~> 2.57"
  region  = var.aws_region
}

// Resources
resource "aws_cognito_user_pool" "user_pool" {
  name = "user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  password_policy {
    minimum_length = var.password_length
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Account Confirmation"
    email_message        = "Your confirmation code is {####}"
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "email"
    required                 = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }
}

resource "aws_cognito_user_pool_client" "client" {
  name = "cognito-client"

  user_pool_id                  = aws_cognito_user_pool.user_pool.id
  generate_secret               = true
  refresh_token_validity        = 90
  prevent_user_existence_errors = "ENABLED"
  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH"
  ]

}

resource "aws_cognito_user_pool_domain" "cognito-domain" {
  domain       = "aelatgt-${var.environment}"
  user_pool_id = "${aws_cognito_user_pool.user_pool.id}"
}

# output "application_secret" {
#   value = aws.aws_cognito_user_pool_client.client
# }