#include<iostream>
#include<climits> 
using namespace std;

int main()
{
    int n = 7;
    int arr[7]= {3,-4,1,3,-5,7,8};

    int maxSum = INT_MIN;

    for(int st = 0; st < n; st++)
    {
        int currsum = 0;
        for(int end = st; end < n; end++)
        { 
            currsum += arr[end];
            maxSum = max(maxSum, currsum);
            if(currsum<0)
            {
                currsum=0;
            }
        
        }
    }

    cout << "Max subarray sum: " << maxSum;

    return 0;
}
