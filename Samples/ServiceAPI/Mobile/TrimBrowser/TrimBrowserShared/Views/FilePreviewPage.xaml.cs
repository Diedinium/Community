﻿using Plugin.Media;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TrimBrowser.Controls;
using Xamarin.Forms;
using Xamarin.Forms.Xaml;

namespace TrimBrowser
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class FilePreviewPage : ContentPage
    {

        FilePreviewViewModel viewModel;
        public FilePreviewPage()
        {
            InitializeComponent();

            var item = new Item
            {
                Text = "Item 1",
                Description = "This is an item description."
            };

            viewModel = new FilePreviewViewModel(item);
            viewModel.Setup(this);// PropertyChanged += ViewModel_PropertyChanged;
            BindingContext = viewModel;
        }

        //private void ViewModel_PropertyChanged(object sender, System.ComponentModel.PropertyChangedEventArgs e)
        //{
        //    if (e.PropertyName == "ErrorMessage" 
        //        && !string.IsNullOrEmpty(viewModel.ErrorMessage))
        //    {
        //        DisplayAlert("Error", viewModel.ErrorMessage, "OK");
        //    }
        //}

        public FilePreviewPage(FilePreviewViewModel viewModel)
        {
            InitializeComponent();

            BindingContext = this.viewModel = viewModel;

            ShowPreviewButton.Clicked += ShowPreviewButton_Clicked;

        }

        private CustomWebView webView = null;

        public void ShowFile(string uri)
        {
            if (webView == null)
            {
                webView = new CustomWebView() { Uri = uri, HorizontalOptions = LayoutOptions.FillAndExpand, VerticalOptions = LayoutOptions.FillAndExpand };
                RootLayout.Children.Add(webView);
                ShowPreviewButton.IsVisible = false;
            }
        }

        private async void ShowPreviewButton_Clicked(object sender, EventArgs e)
        {

            MessagingCenter.Send(this, "GetFile");


        }
    }
}