# Statements for a live upload

Five bank statements for registering a fresh account and importing during a demo.
None of these personas is used by a pre-seeded demo account, so the data is new.

| File | Persona | Income/mo | Savings |
|---|---|---|---|
| `01_vivek_bank_officer.csv` | Bank officer, car loan, SIP + PPF | ₹78,100 | 30% |
| `02_fatima_staff_nurse.csv` | Staff nurse, night-shift allowance, education loan | ₹58,400 | 41% |
| `03_karthik_content_creator.csv` | YouTuber, AdSense + brand deals, camera EMI | ₹75,967 | 42% |
| `04_priyanka_ca_trainee.csv` | CA trainee on a stipend, exam fees | ₹21,933 | 42% |
| `05_george_hotel_chef.csv` | Hotel chef, gold loan, children's school fees | ₹73,067 | 24% |

Each covers June–August 2026 (three months) with columns
`date, description, merchant, amount, type, category`.

## How to use

1. Open the app and choose **Create an account**. Monthly income is not asked
   for — it is worked out from the salary credits in the statement.
2. Go to **Transactions → Upload CSV** and pick one file.
3. Open the **Dashboard**. Income, spend, investments and the savings rate are
   all filled in from the file.

Uploading the same file twice skips every row as a duplicate — which is itself
worth showing, since it demonstrates duplicate detection.
