# why?

the old connector (`accelo-powerbi`) has too much complexity,
technical debt, and it doesn't meet requirements.


# nifty

Get realtime, colored, filtered, readable output from a bunyan logfile:

```bash
tail -f logs/all.log | bunyan -c 'this.level >= TRACE' --color | less -R +F
```

# exit codes

## `1`

Something... bad happened?

TODO: use more informative error codes 


## token response sample

```json
{
  "deployment_name": "Big Blue Digital",
  "access_token": "ywnvwgMY█████████████████████████████████████████████████████RZV",
  "account_details": {
    "email": "noreply@accelo.com",
    "username": "hiive_system",
    "phone": "",
    "title": null,
    "user_access": {
      "campaign": {
        "view": 1,
        "dashboard": "",
        "manages": 0,
        "admin": 1,
        "add": 1
      },
      "issue": {
        "manages": 0,
        "admin": 1,
        "add": 1,
        "view": 1,
        "dashboard": 1
      },
      "prospect": {
        "add": 1,
        "admin": 1,
        "manages": 0,
        "dashboard": 1,
        "view": 1
      },
      "contract_period": {
        "dashboard": "",
        "view": 1,
        "add": 1,
        "admin": 1,
        "manages": 0
      },
      "contact": {
        "admin": 1,
        "add": 1,
        "manages": 0,
        "dashboard": 1,
        "view": 1
      },
      "invoice": {
        "dashboard": "",
        "view": 1,
        "add": 1,
        "admin": "",
        "manages": 0
      },
      "contract": {
        "manages": 0,
        "add": 1,
        "admin": 1,
        "view": 1,
        "dashboard": ""
      },
      "timer": {
        "view": 1,
        "dashboard": "",
        "manages": 0,
        "add": 1,
        "admin": ""
      },
      "account_invoice": {
        "view": 1,
        "dashboard": "",
        "manages": 0,
        "admin": 1,
        "add": 1
      },
      "division": {
        "view": 1,
        "dashboard": "",
        "manages": 0,
        "admin": "",
        "add": ""
      },
      "company": {
        "admin": 1,
        "add": 1,
        "manages": 0,
        "dashboard": 1,
        "view": 1
      },
      "activity": {
        "manages": 0,
        "admin": 1,
        "add": 1,
        "view": 1,
        "dashboard": 1
      },
      "request": {
        "dashboard": "",
        "view": 1,
        "add": "",
        "admin": 1,
        "manages": 0
      },
      "asset": {
        "dashboard": "",
        "view": 1,
        "admin": 1,
        "add": 1,
        "manages": 0
      },
      "expense": {
        "manages": 0,
        "admin": "",
        "add": 1,
        "view": 1,
        "dashboard": ""
      },
      "task": {
        "manages": 0,
        "admin": 1,
        "add": 1,
        "view": 1,
        "dashboard": ""
      },
      "job": {
        "manages": 0,
        "add": 1,
        "admin": 1,
        "view": 1,
        "dashboard": 1
      },
      "quote": {
        "dashboard": "",
        "view": 1,
        "admin": 1,
        "add": 1,
        "manages": 0
      },
      "resource": {
        "manages": 0,
        "add": 1,
        "admin": 1,
        "view": 1,
        "dashboard": ""
      },
      "milestone": {
        "view": 1,
        "dashboard": "",
        "manages": 0,
        "admin": 1,
        "add": 1
      }
    },
    "user_defined_titles": {
      "asset": {
        "plural": "Assets",
        "singular": "Asset"
      },
      "request": {
        "singular": "Request",
        "plural": "Requests"
      },
      "campaign_action": {
        "singular": "Campaign Communication",
        "plural": "Campaign Communications"
      },
      "job_manager": {
        "singular": "Manager",
        "plural": "Managers"
      },
      "affiliation": {
        "singular": "Contact",
        "plural": "Contacts"
      },
      "quote": {
        "singular": "Quote",
        "plural": "Quotes"
      },
      "contract_manager": {
        "singular": "Manager",
        "plural": "Managers"
      },
      "expense": {
        "plural": "Expenses",
        "singular": "Expense"
      },
      "job": {
        "plural": "Projects",
        "singular": "Project"
      },
      "task": {
        "plural": "Tasks",
        "singular": "Task"
      },
      "location": {
        "singular": "Location",
        "plural": "Locations"
      },
      "milestone": {
        "singular": "Milestone",
        "plural": "Milestones"
      },
      "prospect_manager": {
        "plural": "Salespeople",
        "singular": "Salesperson"
      },
      "material": {
        "singular": "Materials/Discounts",
        "plural": "Materials/Discounts"
      },
      "issue": {
        "plural": "Issues",
        "singular": "Issue"
      },
      "contact": {
        "plural": "Contacts",
        "singular": "Contact"
      },
      "accounts": {
        "plural": "Billing",
        "singular": "Billing"
      },
      "account_invoice": {
        "singular": "Invoice",
        "plural": "Invoices"
      },
      "period": {
        "singular": "Period",
        "plural": "Periods"
      },
      "milestone_manager": {
        "singular": "Manager",
        "plural": "Managers"
      },
      "issue_manager": {
        "plural": "Assignees",
        "singular": "Assignee"
      },
      "contributor": {
        "singular": "Contributor",
        "plural": "Contributors"
      },
      "bookmark": {
        "plural": "Favorites",
        "singular": "Favorite"
      },
      "authorities": {
        "singular": "authorities",
        "plural": "authorities"
      },
      "site": {
        "singular": "Site",
        "plural": "Sites"
      },
      "deployment": {
        "plural": "Deployments",
        "singular": "Deployment"
      },
      "campaign": {
        "singular": "Campaign",
        "plural": "Campaigns"
      },
      "contract_period": {
        "plural": "Membership Periods",
        "singular": "Membership Period"
      },
      "tax": {
        "plural": "Taxes",
        "singular": "Tax"
      },
      "segmentation": {
        "singular": "Category",
        "plural": "Categories"
      },
      "prospect": {
        "plural": "Opportunities",
        "singular": "Opportunity"
      },
      "division": {
        "singular": "Division",
        "plural": "Divisions"
      },
      "company": {
        "singular": "Client",
        "plural": "Clients"
      },
      "estimate": {
        "singular": "Estimate",
        "plural": "Estimates"
      },
      "account_purchase": {
        "singular": "Purchase",
        "plural": "Purchases"
      },
      "contract": {
        "singular": "Membership",
        "plural": "Memberships"
      }
    },
    "mobile": "",
    "fax": "",
    "surname": "Support",
    "locale": {
      "currency": {
        "symbol": "$"
      }
    },
    "firstname": "Accelo",
    "access_level": "admin",
    "initials": "IS",
    "id": "1",
    "position": ""
  },
  "account_id": "MXN█████████████████████████████████████bQ",
  "token_type": "Bearer",
  "deployment_uri": "bigbluedigital.accelo.com",
  "deployment": "bigbluedigital",
  "expires_in": 2592000
}
```
